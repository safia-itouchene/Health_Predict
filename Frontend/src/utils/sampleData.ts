// Sample data for visualization charts

export const monthlyRevenueData = {
  x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  y: [8500, 10200, 12800, 11400, 15700, 14900, 16200, 18500, 17300],
  name: 'Monthly Revenue ($)',
};

export const userGrowthData = {
  x: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
  y: [
    5200, 5500, 5700, 6000, 6200, 6500, 6800, 7100, 7400, 7700,
    8000, 8300, 8600, 8900, 9200, 9500, 9800, 10100, 10400, 10700,
    11000, 11300, 11600, 11900, 12200, 12500, 12800, 13100, 13400, 13700
  ],
  name: 'Active Users',
};

export const productMetricsData = {
  x: [45, 32, 78, 51, 25, 67, 89, 34, 56, 72, 91, 18, 40, 53, 66, 81, 29, 47, 63, 75],
  y: [4.1, 3.8, 4.7, 4.2, 3.5, 4.4, 4.8, 3.7, 4.3, 4.5, 4.9, 3.2, 4.0, 4.3, 4.5, 4.7, 3.6, 4.1, 4.4, 4.6],
  mode: 'markers',
  text: [
    'Product A', 'Product B', 'Product C', 'Product D', 'Product E',
    'Product F', 'Product G', 'Product H', 'Product I', 'Product J',
    'Product K', 'Product L', 'Product M', 'Product N', 'Product O',
    'Product P', 'Product Q', 'Product R', 'Product S', 'Product T'
  ],
  marker: {
    size: [25, 18, 42, 30, 15, 38, 47, 19, 32, 40, 50, 10, 24, 31, 37, 45, 17, 28, 35, 41],
    sizeref: 0.1,
    sizemode: 'area',
  },
};

export const revenueByCategoryData = {
  labels: ['Electronics', 'Clothing', 'Home Goods', 'Books', 'Toys', 'Sports'],
  values: [42, 26, 18, 7, 5, 12],
  type: 'pie',
};

export const createHeatmapData = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
  
  const z = days.map(() => 
    Array.from({length: 24}, () => Math.floor(Math.random() * 100))
  );
  
  return { x: hours, y: days, z };
};

export const boxPlotData = {
  x: ['Service A', 'Service B', 'Service C', 'Service D', 'Service E'],
  y: [
    [12, 15, 18, 24, 28, 32, 35, 38],
    [5, 8, 10, 12, 15, 18, 20, 22],
    [22, 25, 28, 32, 35, 38, 42, 45],
    [8, 10, 12, 15, 18, 20, 22, 25],
    [15, 18, 22, 25, 28, 32, 35, 38]
  ].map(items => ({
    q1: items[1],
    median: items[3],
    q3: items[5],
    lowerfence: items[0],
    upperfence: items[7],
    mean: items.reduce((a, b) => a + b, 0) / items.length,
    sd: 5
  })),
  type: 'box',
};

export const customerGrowthData = {
  x: Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`),
  y: [1000, 2200, 3800, 5900, 8500, 11800, 15700, 20200, 25300, 31000, 37500, 45000],
};

export const revenueChangesData = {
  x: ['Initial', 'Sales', 'Refunds', 'Shipping', 'Tax', 'Final'],
  y: [0, 1200, -200, 150, -180, 970],
  text: ['Start', '+$1,200', '-$200', '+$150', '-$180', 'End'],
  connector: { line: { color: 'rgb(63, 63, 63)' } },
};

export const productMetricsRadarData = {
  r: [4.5, 4.2, 4.8, 4.1, 4.3],
  r2: [3.8, 4.5, 4.1, 4.4, 3.9],
  theta: ['Quality', 'Price', 'Features', 'Support', 'UX'],
};