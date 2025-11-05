import React, { useState } from 'react';
import { Download, FileText, Calendar, Filter, TrendingUp, PieChart, BarChart } from 'lucide-react';

interface ReportConfig {
  type: 'transactions' | 'budget' | 'analytics' | 'summary';
  format: 'pdf' | 'excel' | 'csv';
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  includeCharts: boolean;
}

const DownloadReport: React.FC = () => {
  const [config, setConfig] = useState<ReportConfig>({
    type: 'transactions',
    format: 'pdf',
    dateRange: 'month',
    startDate: '',
    endDate: '',
    includeCharts: true
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypes = [
    {
      type: 'transactions' as const,
      title: 'Transaction Report',
      description: 'Detailed list of all your transactions with categories and trends',
      icon: <FileText className="h-6 w-6" />
    },
    {
      type: 'budget' as const,
      title: 'Budget Analysis',
      description: 'Budget vs actual spending analysis with recommendations',
      icon: <PieChart className="h-6 w-6" />
    },
    {
      type: 'analytics' as const,
      title: 'Financial Analytics',
      description: 'Comprehensive financial analysis with insights and projections',
      icon: <TrendingUp className="h-6 w-6" />
    },
    {
      type: 'summary' as const,
      title: 'Executive Summary',
      description: 'High-level overview of your financial health and key metrics',
      icon: <BarChart className="h-6 w-6" />
    }
  ];

  const formatOptions = [
    { value: 'pdf' as const, label: 'PDF Document', description: 'Best for viewing and printing' },
    { value: 'excel' as const, label: 'Excel Spreadsheet', description: 'Best for data analysis' },
    { value: 'csv' as const, label: 'CSV File', description: 'Best for data import/export' }
  ];

  const dateRangeOptions = [
    { value: 'week' as const, label: 'Last 7 days' },
    { value: 'month' as const, label: 'Last 30 days' },
    { value: 'quarter' as const, label: 'Last 3 months' },
    { value: 'year' as const, label: 'Last 12 months' },
    { value: 'custom' as const, label: 'Custom date range' }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // In a real app, this would call an API to generate the report
    console.log('Generating report with config:', config);
    
    // Simulate download
    const fileName = `${config.type}_report_${new Date().toISOString().split('T')[0]}.${config.format}`;
    alert(`Report "${fileName}" would be downloaded now!`);
    
    setIsGenerating(false);
  };

  const updateConfig = (updates: Partial<ReportConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Download className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Download Reports
          </h1>
          <p className="text-gray-600 mt-2">
            Generate and download comprehensive financial reports
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Type Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Report Type
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportTypes.map((report) => (
                  <button
                    key={report.type}
                    onClick={() => updateConfig({ type: report.type })}
                    className={`text-left p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      config.type === report.type
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 bg-white/50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className={`p-2 rounded-lg mr-3 ${
                        config.type === report.type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {report.icon}
                      </div>
                      <h4 className="font-semibold text-gray-800">{report.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Export Format
              </h3>
              <div className="space-y-3">
                {formatOptions.map((format) => (
                  <label
                    key={format.value}
                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all hover:bg-gray-50 ${
                      config.format === format.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={format.value}
                      checked={config.format === format.value}
                      onChange={(e) => updateConfig({ format: e.target.value as any })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                      config.format === format.value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-400'
                    }`}>
                      {config.format === format.value && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{format.label}</div>
                      <div className="text-sm text-gray-600">{format.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Date Range
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dateRangeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateConfig({ dateRange: option.value })}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                        config.dateRange === option.value
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {config.dateRange === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={config.startDate}
                        onChange={(e) => updateConfig({ startDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={config.endDate}
                        onChange={(e) => updateConfig({ endDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Options */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Additional Options
              </h3>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeCharts}
                  onChange={(e) => updateConfig({ includeCharts: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                  config.includeCharts
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-400'
                }`}>
                  {config.includeCharts && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-800">Include Charts and Graphs</div>
                  <div className="text-sm text-gray-600">Add visual representations to your report</div>
                </div>
              </label>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="space-y-6">
            {/* Report Preview */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Report Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{reportTypes.find(r => r.type === config.type)?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium">{config.format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Period:</span>
                  <span className="font-medium">
                    {dateRangeOptions.find(d => d.value === config.dateRange)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Charts:</span>
                  <span className="font-medium">{config.includeCharts ? 'Included' : 'Excluded'}</span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-4 rounded-xl font-semibold transition-all transform shadow-lg ${
                isGenerating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105'
              } text-white`}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating Report...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Download className="h-5 w-5 mr-2" />
                  Generate & Download
                </div>
              )}
            </button>

            {/* Recent Reports */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Reports</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <div className="text-sm font-medium">Transaction Report</div>
                    <div className="text-xs text-gray-500">2 days ago</div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Download
                  </button>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <div className="text-sm font-medium">Budget Analysis</div>
                    <div className="text-xs text-gray-500">1 week ago</div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Download
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">Monthly Summary</div>
                    <div className="text-xs text-gray-500">2 weeks ago</div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadReport;