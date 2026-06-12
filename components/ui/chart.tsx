import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Pie,
  Cell,
} from "recharts"

interface BarChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: any) => string
  className?: string
}

export function BarChart({ data, index, categories, colors, valueFormatter, className }: BarChartProps) {
  return (
    <RechartsBarChart data={data} className={className}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={index} />
      <YAxis />
      <Tooltip formatter={valueFormatter ? (value) => [valueFormatter(value)] : undefined} />
      <Legend />
      {categories.map((category, i) => (
        <Bar dataKey={category} fill={colors[i % colors.length]} key={category} />
      ))}
    </RechartsBarChart>
  )
}

interface LineChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: any) => string
  className?: string
}

export function LineChart({ data, index, categories, colors, valueFormatter, className }: LineChartProps) {
  return (
    <RechartsLineChart data={data} className={className}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={index} />
      <YAxis />
      <Tooltip formatter={valueFormatter ? (value) => [valueFormatter(value)] : undefined} />
      <Legend />
      {categories.map((category, i) => (
        <Line type="monotone" dataKey={category} stroke={colors[i % colors.length]} key={category} />
      ))}
    </RechartsLineChart>
  )
}

interface PieChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: any) => string
  className?: string
}

export function PieChart({ data, index, categories, colors, valueFormatter, className }: PieChartProps) {
  return (
    <RechartsPieChart className={className}>
      <Pie data={data} dataKey={categories[0]} nameKey={index} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
      </Pie>
      <Tooltip formatter={valueFormatter ? (value) => [valueFormatter(value)] : undefined} />
      <Legend />
    </RechartsPieChart>
  )
}
