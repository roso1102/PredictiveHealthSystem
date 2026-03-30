import pandas as pd
import plotly.express as px
from typing import Dict, List, Optional, Any
import numpy as np
from sklearn.cluster import DBSCAN
from geopy.geocoders import Nominatim

class RegionalAnalysis:
    """
    A class for analyzing and visualizing regional health patterns and trends.
    
    This class provides functionality to:
    - Load and analyze regional health data
    - Calculate disease prevalence in regions
    - Analyze demographic patterns
    - Identify disease hotspots
    - Generate visualizations and summary reports
    
    Attributes:
        regional_data (pd.DataFrame): The loaded regional health data
        geolocator (Nominatim): Geocoding service for location operations
    """

    def __init__(self):
        """Initialize a new RegionalAnalysis instance."""
        self.regional_data = None
        self.bengaluru_data = None
        self.geolocator = Nominatim(user_agent="health_analysis")

    @staticmethod
    def is_bangalore_region(region: str) -> bool:
        if region is None:
            return False
        r = str(region).strip().lower().replace(' ', '')
        return r in ('bangalore', 'bengaluru')

    def load_bengaluru_data(self, data_path: str) -> None:
        """Load Bengaluru / Bangalore ward-level demo data for map + trends."""
        self.bengaluru_data = pd.read_csv(data_path)

    def load_data(self, data_path: str) -> None:
        """
        Load regional health data from a CSV file.
        
        Args:
            data_path (str): Path to the CSV file containing regional health data
        """
        self.regional_data = pd.read_csv(data_path)
        
    def analyze_regional_patterns(self, region: str) -> Dict:
        """
        Analyze health patterns in a specific region.
        
        Args:
            region (str): Name of the region to analyze (e.g., 'North', 'South')
            
        Returns:
            Dict: Analysis results containing:
                - disease_prevalence: Disease counts and percentages
                - health_indicators: Statistical analysis of health metrics
                - demographic_patterns: Age and gender distribution analysis
                
        Example:
            {
                'disease_prevalence': {
                    'Diabetes': {'count': 100, 'percentage': 25.0},
                    'Hypertension': {'count': 150, 'percentage': 37.5}
                },
                'health_indicators': {
                    'bmi': {'mean': 24.5, 'median': 23.8, 'std': 4.2}
                },
                'demographic_patterns': {
                    'age_groups': {'18-29': 50, '30-44': 100},
                    'gender_distribution': {'M': 120, 'F': 180}
                }
            }
        """
        region_data = None
        if self.is_bangalore_region(region) and self.bengaluru_data is not None and not self.bengaluru_data.empty:
            region_data = self.bengaluru_data.copy()
        elif self.regional_data is not None:
            region_data = self.regional_data[
                self.regional_data['region'] == region
            ].copy()

        if region_data is None or region_data.empty:
            return {}

        if 'age_group' not in region_data.columns or region_data['age_group'].isna().all():
            region_data['age_group'] = region_data['age'].map(self._age_bucket)

        analysis = {
            'disease_prevalence': self._calculate_disease_prevalence(region_data),
            'health_indicators': self._analyze_health_indicators(region_data),
            'demographic_patterns': self._analyze_demographics(region_data)
        }

        return analysis

    @staticmethod
    def _age_bucket(age) -> str:
        try:
            if pd.isna(age):
                return 'Unknown'
            a = int(float(age))
        except (TypeError, ValueError):
            return 'Unknown'
        if a < 18:
            return '0-17'
        if a < 30:
            return '18-29'
        if a < 45:
            return '30-44'
        if a < 60:
            return '45-59'
        return '60+'

    def _pick_dataframe_for_city(self, city: Optional[str]) -> Optional[pd.DataFrame]:
        key = (city or 'global').strip().lower()
        if key in ('bengaluru', 'bangalore', 'blr'):
            if self.bengaluru_data is None or self.bengaluru_data.empty:
                return None
            return self.bengaluru_data.copy()
        if self.regional_data is None or self.regional_data.empty:
            return None
        return self.regional_data.copy()

    def _apply_disease_filter(
        self,
        df: pd.DataFrame,
        disease: Optional[str],
        diseases: Optional[List[str]],
    ) -> pd.DataFrame:
        active: List[str] = []
        if diseases:
            active = [d for d in diseases if d and str(d).lower() != 'all']
        elif disease and str(disease).lower() != 'all':
            active = [disease]
        if not active:
            return df
        return df[df['diagnosis'].isin(active)]

    def _weekly_series(self, df: pd.DataFrame) -> Dict[str, Any]:
        if df.empty or 'visit_date' not in df.columns:
            return {'weeks': [], 'series': {}}
        d = df.copy()
        d['_w'] = pd.to_datetime(d['visit_date'], errors='coerce').dt.to_period('W-MON').astype(str)
        d = d[d['_w'].notna()]
        if d.empty:
            return {'weeks': [], 'series': {}}
        weeks = sorted(d['_w'].unique())
        diseases = sorted(d['diagnosis'].dropna().unique().tolist())
        series: Dict[str, List[int]] = {}
        for dis in diseases:
            sub = d[d['diagnosis'] == dis]
            cnts = sub.groupby('_w').size().reindex(weeks, fill_value=0)
            series[dis] = [int(x) for x in cnts.tolist()]
        return {'weeks': weeks, 'series': series}

    def get_map_points(
        self,
        disease: Optional[str] = None,
        decimals: int = 2,
        city: Optional[str] = None,
        diseases: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Aggregate rows into map points (grid cells, or Bengaluru wards/areas).
        """
        df_base = self._pick_dataframe_for_city(city)
        if df_base is None:
            return {
                'points': [],
                'diseases': [],
                'bounds': None,
                'subregions': [],
                'weekly_series': {'weeks': [], 'series': {}},
                'alerts': [],
                'city': city or 'global',
            }

        diseases_all = sorted(df_base['diagnosis'].dropna().unique().tolist())
        df = self._apply_disease_filter(df_base, disease, diseases)

        empty_tail = {
            'diseases': diseases_all,
            'bounds': None,
            'subregions': [],
            'weekly_series': self._weekly_series(df),
            'alerts': [],
            'city': city or 'global',
        }

        if df.empty:
            return {'points': [], **empty_tail}

        df = df[pd.notna(df['latitude']) & pd.notna(df['longitude'])]
        if df.empty:
            return {'points': [], **empty_tail}

        city_key = (city or 'global').strip().lower()
        use_areas = city_key in ('bengaluru', 'bangalore', 'blr') and 'area' in df.columns

        if use_areas:
            def _mix_str(g: pd.DataFrame) -> str:
                vc = g['diagnosis'].value_counts(normalize=True).head(3)
                parts = [f"{idx} {v * 100:.0f}%" for idx, v in vc.items()]
                return ', '.join(parts)

            rows = []
            for area, g in df.groupby('area'):
                lat = float(g['latitude'].mean())
                lng = float(g['longitude'].mean())
                weight = int(len(g))
                top = g['diagnosis'].value_counts().index[0]
                share = float(g['diagnosis'].value_counts().iloc[0] / weight * 100)
                rows.append({
                    'lat': lat,
                    'lng': lng,
                    'weight': weight,
                    'area': str(area),
                    'top_diagnosis': str(top),
                    'top_share_pct': round(share, 1),
                    'diagnosis_mix': _mix_str(g),
                })
            points = rows
            total_visits = int(df.groupby('area').size().sum())
            subregions = sorted(
                [
                    {
                        'area': r['area'],
                        'count': r['weight'],
                        'top_diagnosis': r['top_diagnosis'],
                        'share_pct': r['top_share_pct'],
                        'pct_of_city': round(r['weight'] / total_visits * 100, 1) if total_visits else 0,
                    }
                    for r in rows
                ],
                key=lambda x: x['count'],
                reverse=True,
            )
            mean_c = sum(s['count'] for s in subregions) / max(len(subregions), 1)
            threshold = max(8.0, mean_c * 1.35)
            alerts = [
                {
                    'area': s['area'],
                    'count': s['count'],
                    'top_diagnosis': s['top_diagnosis'],
                    'message': (
                        f"{s['area']}: elevated burden ({s['count']} visits; "
                        f"leading diagnosis {s['top_diagnosis']})."
                    ),
                }
                for s in subregions
                if s['count'] >= threshold
            ]
        else:
            df['lat_r'] = df['latitude'].round(decimals)
            df['lng_r'] = df['longitude'].round(decimals)
            agg = df.groupby(['lat_r', 'lng_r']).size().reset_index(name='weight')

            points = []
            for _, row in agg.iterrows():
                cell = df[(df['lat_r'] == row['lat_r']) & (df['lng_r'] == row['lng_r'])]
                top = cell['diagnosis'].value_counts()
                top_d = top.index[0] if len(top) else ''
                share = float(top.iloc[0] / len(cell) * 100) if len(cell) else 0.0
                mix = cell['diagnosis'].value_counts(normalize=True).head(3)
                mix_s = ', '.join([f"{idx} {v * 100:.0f}%" for idx, v in mix.items()])
                points.append({
                    'lat': float(row['lat_r']),
                    'lng': float(row['lng_r']),
                    'weight': int(row['weight']),
                    'area': None,
                    'top_diagnosis': str(top_d),
                    'top_share_pct': round(share, 1),
                    'diagnosis_mix': mix_s,
                })
            subregions = sorted(
                [
                    {
                        'area': p.get('area') or f"{p['lat']:.2f},{p['lng']:.2f}",
                        'count': p['weight'],
                        'top_diagnosis': p['top_diagnosis'],
                        'share_pct': p['top_share_pct'],
                        'pct_of_city': None,
                    }
                    for p in points
                ],
                key=lambda x: x['count'],
                reverse=True,
            )[:15]
            alerts = []

        bounds = {
            'south': float(df['latitude'].min()),
            'north': float(df['latitude'].max()),
            'west': float(df['longitude'].min()),
            'east': float(df['longitude'].max()),
        }

        return {
            'points': points,
            'diseases': diseases_all,
            'bounds': bounds,
            'subregions': subregions,
            'weekly_series': self._weekly_series(df),
            'alerts': alerts,
            'city': city_key if city_key in ('bengaluru', 'bangalore', 'blr') else 'global',
        }
    
    def _calculate_disease_prevalence(self, region_data: pd.DataFrame) -> Dict:
        """
        Calculate disease prevalence in the region.
        
        Args:
            region_data (pd.DataFrame): DataFrame containing regional health data
            
        Returns:
            Dict: Dictionary of diseases with their counts and percentages
                {
                    'disease_name': {
                        'count': number_of_cases,
                        'percentage': percentage_of_total
                    }
                }
        """
        total_patients = len(region_data)
        disease_counts = region_data['diagnosis'].value_counts()
        
        prevalence = {
            disease: {
                'count': count,
                'percentage': (count / total_patients) * 100
            }
            for disease, count in disease_counts.items()
        }
        
        return prevalence
    
    def _analyze_health_indicators(self, region_data: pd.DataFrame) -> Dict:
        """
        Analyze key health indicators in the region.
        
        Args:
            region_data (pd.DataFrame): DataFrame containing regional health data
            
        Returns:
            Dict: Statistical analysis of numeric health indicators
                {
                    'indicator_name': {
                        'mean': mean_value,
                        'median': median_value,
                        'std': standard_deviation
                    }
                }
        """
        indicators = {}
        
        numeric_columns = region_data.select_dtypes(include=[np.number]).columns
        for indicator in numeric_columns:
            if indicator not in ['patient_id', 'latitude', 'longitude']:
                indicators[indicator] = {
                    'mean': region_data[indicator].mean(),
                    'median': region_data[indicator].median(),
                    'std': region_data[indicator].std()
                }
        
        return indicators
    
    def _analyze_demographics(self, region_data: pd.DataFrame) -> Dict:
        """
        Analyze demographic patterns in health outcomes.
        
        Args:
            region_data (pd.DataFrame): DataFrame containing regional health data
            
        Returns:
            Dict: Demographic analysis containing:
                - age_groups: Distribution of patients by age group
                - gender_distribution: Distribution of patients by gender
                - age_health_correlation: Disease prevalence by age group
        """
        demographics = {
            'age_groups': region_data['age_group'].value_counts().to_dict(),
            'gender_distribution': region_data['gender'].value_counts().to_dict()
        }
        
        if 'age_group' in region_data.columns and 'diagnosis' in region_data.columns:
            corr = region_data.groupby('age_group')['diagnosis'].value_counts()
            nested: Dict[str, Dict[str, int]] = {}
            for (ag, diag), cnt in corr.items():
                nested.setdefault(str(ag), {})[str(diag)] = int(cnt)
            demographics['age_health_correlation'] = nested

        return demographics
    
    def identify_hotspots(self, condition: str) -> List[Dict]:
        """
        Identify geographical hotspots for specific health conditions using DBSCAN clustering.
        
        Args:
            condition (str): The health condition to analyze
            
        Returns:
            List[Dict]: List of identified hotspots, each containing:
                - center: [latitude, longitude] of cluster center
                - count: Number of cases in the cluster
                - severity: 'low', 'medium', or 'high'
                - recent_cases: Number of cases in last 14 days
                - radius: Radius of the cluster in coordinate units
                
        Notes:
            - Uses DBSCAN clustering with eps=0.1 and min_samples=5
            - Severity levels:
                - low: < 10 cases
                - medium: 10-20 cases
                - high: > 20 cases
        """
        if self.regional_data is None:
            return []
            
        condition_data = self.regional_data[
            self.regional_data['diagnosis'] == condition
        ]
        
        # Use DBSCAN for clustering
        if len(condition_data) > 0 and 'latitude' in condition_data.columns:
            coords = condition_data[['latitude', 'longitude']].values
            clustering = DBSCAN(eps=0.1, min_samples=5).fit(coords)
            
            hotspots = []
            for cluster_id in set(clustering.labels_):
                if cluster_id != -1:  # Exclude noise points
                    cluster_points = coords[clustering.labels_ == cluster_id]
                    cluster_size = len(cluster_points)
                    
                    # Calculate severity based on cluster size and rate of increase
                    severity = 'low'
                    if cluster_size > 10:
                        severity = 'medium'
                    if cluster_size > 20:
                        severity = 'high'
                    
                    # Get recent cases (last 14 days) to check for rapid increase
                    recent_cases = condition_data[
                        pd.to_datetime(condition_data['visit_date']) > 
                        (pd.Timestamp.now() - pd.Timedelta(days=14))
                    ]
                    recent_count = len(recent_cases)
                    
                    hotspots.append({
                        'center': cluster_points.mean(axis=0).tolist(),
                        'count': cluster_size,
                        'severity': severity,
                        'recent_cases': recent_count,
                        'radius': np.max(np.linalg.norm(cluster_points - cluster_points.mean(axis=0), axis=1))
                    })
                    
            return hotspots
        return []
    
    def plot_regional_heatmap(self, disease: str = None):
        """
        Create a heatmap visualization for disease prevalence using Plotly.
        
        Args:
            disease (str, optional): The specific disease to visualize.
                If None, visualizes all diseases with color indicating prevalence.
            
        Returns:
            plotly.graph_objects.Figure or None: Interactive mapbox scatter plot
            showing the distribution of diseases across regions.
            Returns None if data is missing or an error occurs.
            
        Notes:
            - Uses OpenStreetMap style for base map
            - Color scale: Viridis
            - Point size indicates case count
            - Default zoom level: 7
        """
        if self.regional_data is None:
            return None
            
        try:
            # If specific disease is provided, filter for that disease
            if disease and disease in self.regional_data['diagnosis'].unique():
                plot_data = self.regional_data[self.regional_data['diagnosis'] == disease]
                # Group by coordinates and count occurrences
                plot_data = plot_data.groupby(['latitude', 'longitude', 'region']).size().reset_index(name='count')
                size_col = 'count'
                color_col = 'count'
                title = f'{disease} Distribution by Region'
            else:
                # Create a dataframe of all diseases with counts by location
                plot_data = self.regional_data.groupby(['latitude', 'longitude', 'region', 'diagnosis']).size().reset_index(name='count')
                size_col = 'count'
                color_col = 'count'
                title = 'Disease Prevalence by Region'
            
            # Create a scatter mapbox for visualization
            fig = px.scatter_mapbox(
                plot_data,
                lat='latitude',
                lon='longitude',
                color=color_col,
                size=size_col,
                size_max=15,
                color_continuous_scale='Viridis',
                hover_data=['region', 'count'],
                zoom=7,
                title=title,
                mapbox_style='open-street-map'
            )
            
            # Update layout for better visibility
            fig.update_layout(
                margin={"r":0,"t":30,"l":0,"b":0},
                height=600
            )
            
            return fig
        except Exception as e:
            print(f"Error creating heatmap: {str(e)}")
            return None
    
    def generate_region_summary(self, region: str) -> str:
        """
        Generate a text summary report for a specific region.
        
        Args:
            region (str): Name of the region to summarize
            
        Returns:
            str: Formatted summary report containing:
                - Top 5 health conditions with percentages
                - Key health indicators with means and standard deviations
                
        Example:
            Health Analysis Summary for North

            Top 5 Health Conditions:
            - Hypertension: 25.5%
            - Diabetes: 18.2%
            - Obesity: 15.7%
            - Heart Disease: 12.3%
            - Asthma: 8.8%

            Key Health Indicators:
            - BMI: 26.4 (±4.8)
            - Blood Pressure: 128.5 (±15.2)
        """
        if self.regional_data is None:
            return "No data available"
            
        analysis = self.analyze_regional_patterns(region)
        
        summary = f"Health Analysis Summary for {region}\n\n"
        
        # Add top diseases
        top_diseases = sorted(
            analysis['disease_prevalence'].items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )[:5]
        
        summary += "Top 5 Health Conditions:\n"
        for disease, stats in top_diseases:
            summary += f"- {disease}: {stats['percentage']:.1f}%\n"
            
        # Add key health indicators
        if analysis['health_indicators']:
            summary += "\nKey Health Indicators:\n"
            for indicator, stats in analysis['health_indicators'].items():
                summary += f"- {indicator}: {stats['mean']:.2f} (±{stats['std']:.2f})\n"
                
        return summary