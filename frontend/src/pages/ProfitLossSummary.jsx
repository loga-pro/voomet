import React, { useState, useEffect } from "react";
import { projectBudgetsAPI } from '../services/api';
import useNotification from '../hooks/useNotification';
import Modal from '../components/Modals/Modal';
import {
    ChartBarIcon,
    CurrencyRupeeIcon,
    DocumentTextIcon,
    BanknotesIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    XMarkIcon,
    BuildingStorefrontIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';

const ProfitLossSummary = () => {
    const { showError } = useNotification();
    const [summaryData, setSummaryData] = useState({
        totalProjects: 0,
        totalBoqValue: 0,
        totalNegotiatedValue: 0,
        totalActualSpent: 0,
        totalProfit: 0,
        totalLoss: 0,
        netProfitLoss: 0,
        loading: true
    });
    const [allBudgets, setAllBudgets] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [activeKpiType, setActiveKpiType] = useState('all');

    useEffect(() => {
        fetchBudgets();
    }, []);

    const fetchBudgets = async () => {
        try {
            setSummaryData(prev => ({ ...prev, loading: true }));
            const response = await projectBudgetsAPI.getAll();
            const budgetsData = response.data.budgets || response.data;

            // Store all budgets for filtering
            setAllBudgets(budgetsData);

            // Calculate total projects
            const totalProjects = budgetsData.length;

            // Calculate total BOQ value (quoted price)
            const totalBoqValue = budgetsData.reduce((sum, budget) =>
                sum + (budget.quotedPrice || 0), 0
            );

            // Calculate total negotiated value
            const totalNegotiatedValue = budgetsData.reduce((sum, budget) =>
                sum + (budget.negotiatedPrice || 0), 0
            );

            // Calculate total actual spent
            const totalActualSpent = budgetsData.reduce((sum, budget) =>
                sum + (budget.amountSpent || 0), 0
            );

            // Calculate total profit
            const totalProfit = budgetsData.reduce((sum, budget) =>
                budget.netProfitLoss > 0 ? sum + budget.netProfitLoss : sum, 0
            );

            // Calculate total loss
            const totalLoss = Math.abs(budgetsData.reduce((sum, budget) =>
                budget.netProfitLoss < 0 ? sum + budget.netProfitLoss : sum, 0
            ));

            // Calculate net profit/loss
            const netProfitLoss = totalProfit - totalLoss;

            setSummaryData({
                totalProjects,
                totalBoqValue,
                totalNegotiatedValue,
                totalActualSpent,
                totalProfit,
                totalLoss,
                netProfitLoss,
                loading: false
            });
        } catch (error) {
            showError('Failed to fetch project budgets');
            setSummaryData(prev => ({ ...prev, loading: false }));
        }
    };

    const handleCardClick = (filterType, title) => {
        let filtered = [];

        switch (filterType) {
            case 'all':
                filtered = allBudgets;
                break;
            case 'profit':
                filtered = allBudgets.filter(budget => budget.netProfitLoss > 0);
                break;
            case 'loss':
                filtered = allBudgets.filter(budget => budget.netProfitLoss < 0);
                break;
            case 'net':
                filtered = allBudgets;
                break;
            default:
                filtered = allBudgets;
        }

        setFilteredProjects(filtered);
        setModalTitle(title);
        setActiveKpiType(filterType);
        setIsModalOpen(true);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount || 0);
    };

    // Helper function to determine which columns to show
    const getVisibleColumns = () => {
        const baseColumns = ['projectName', 'customerName'];
        
        switch (activeKpiType) {
            case 'all':
                return baseColumns; // Show only Project Name and Customer Name
            case 'boq':
                return [...baseColumns, 'boqValue'];
            case 'negotiated':
                return [...baseColumns, 'negotiated'];
            case 'spent':
                return [...baseColumns, 'actualSpent'];
            case 'profit':
            case 'loss':
            case 'net':
                return [...baseColumns, 'boqValue', 'negotiated', 'actualSpent', 'netAmount', 'profitLoss'];
            default:
                return [...baseColumns, 'boqValue', 'negotiated', 'actualSpent', 'netAmount', 'profitLoss'];
        }
    };

    if (summaryData.loading) {
        return (
            <div className="w-full bg-white rounded-xl shadow-md p-6 mb-6 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <>
            <div className="w-full mb-6">
                {/* Header */}
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Profit & Loss Overview</h2>
                
                {/* Gradient Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                    {/* Total Projects */}
                    <div 
                        onClick={() => handleCardClick('all', 'All Projects')}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition-all transform hover:scale-105 duration-200 cursor-pointer"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-white text-opacity-90 text-xs sm:text-sm font-medium">Total Projects</p>
                                <p className="text-xl sm:text-2xl font-bold mt-1">{summaryData.totalProjects}</p>
                                <p className="text-xs text-white text-opacity-75 mt-1 hidden sm:block">All Projects</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 sm:p-2 bg-white bg-opacity-20 rounded-full">
                                    <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total BOQ Value */}
                    <div 
                        onClick={() => handleCardClick('boq', 'Projects - BOQ Value')}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition-all transform hover:scale-105 duration-200 cursor-pointer"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-white text-opacity-90 text-xs sm:text-sm font-medium">Total Budget Estimation</p>
                                <p className="text-lg sm:text-xl font-bold mt-1">₹{summaryData.totalBoqValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-xs text-white text-opacity-75 mt-1 hidden sm:block">Quoted Price</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 sm:p-2 bg-white bg-opacity-20 rounded-full">
                                    <DocumentTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Negotiated Value */}
                    <div 
                        onClick={() => handleCardClick('negotiated', 'Projects - Negotiated Value')}
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition-all transform hover:scale-105 duration-200 cursor-pointer"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-white text-opacity-90 text-xs sm:text-sm font-medium">Negotiated Value</p>
                                <p className="text-lg sm:text-xl font-bold mt-1">₹{summaryData.totalNegotiatedValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-xs text-white text-opacity-75 mt-1 hidden sm:block">Final Price</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 sm:p-2 bg-white bg-opacity-20 rounded-full">
                                    <BanknotesIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actual Spent */}
                    <div 
                        onClick={() => handleCardClick('spent', 'Projects - Actual Spent')}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition-all transform hover:scale-105 duration-200 cursor-pointer"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-white text-opacity-90 text-xs sm:text-sm font-medium">Actual Spent</p>
                                <p className="text-lg sm:text-xl font-bold mt-1">₹{summaryData.totalActualSpent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-xs text-white text-opacity-75 mt-1 hidden sm:block">Total Expenses</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 sm:p-2 bg-white bg-opacity-20 rounded-full">
                                    <CurrencyRupeeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Profit/Loss */}
                    <div 
                        onClick={() => handleCardClick('net', 'All Projects - Net Overview')}
                        className={`bg-gradient-to-r ${summaryData.netProfitLoss >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-rose-500 to-rose-600'} text-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition-all transform hover:scale-105 duration-200 cursor-pointer`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-white text-opacity-90 text-xs sm:text-sm font-medium">Net Profit/Loss</p>
                                <p className="text-lg sm:text-xl font-bold mt-1">
                                    {summaryData.netProfitLoss >= 0 ? '+' : '-'}₹{Math.abs(summaryData.netProfitLoss).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-white text-opacity-75 mt-1 hidden sm:block">{summaryData.netProfitLoss >= 0 ? 'Profit' : 'Loss'}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 sm:p-2 bg-white bg-opacity-20 rounded-full">
                                    {summaryData.netProfitLoss >= 0 ? (
                                        <ArrowTrendingUpIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                    ) : (
                                        <ArrowTrendingDownIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Project Details Modal with Table Structure */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`${modalTitle} (${filteredProjects.length})`}
                size="xl"
            >
                <div className="max-h-[600px] overflow-y-auto">
                    {filteredProjects.length === 0 ? (
                        <div className="text-center py-12">
                            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
                            <p className="mt-1 text-sm text-gray-500">No projects match this criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {getVisibleColumns().includes('projectName') && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Project Name
                                            </th>
                                        )}
                                        {getVisibleColumns().includes('customerName') && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Customer
                                            </th>
                                        )}
                                        {getVisibleColumns().includes('boqValue') && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Project Value
                                            </th>
                                        )}
                                        {getVisibleColumns().includes('negotiated') && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Negotiated
                                            </th>
                                        )}
                                        {getVisibleColumns().includes('actualSpent') && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actual Spent
                                            </th>
                                        )}
                                        {getVisibleColumns().includes('netAmount') && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Net Amount
                                            </th>
                                        )}
                                        {getVisibleColumns().includes('profitLoss') && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Profit/Loss
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredProjects.map((project) => (
                                        <tr key={project._id} className="hover:bg-gray-50">
                                            {getVisibleColumns().includes('projectName') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                            <BuildingStorefrontIcon className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                        <div className="ml-3">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {project.projectName}
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center">
                                                                <MapPinIcon className="h-3 w-3 mr-1" />
                                                                {project.siteLocation}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            {getVisibleColumns().includes('customerName') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {project.customerName}
                                                    <div className="text-xs text-gray-500">
                                                        FY: {project.financialYear}
                                                    </div>
                                                </td>
                                            )}
                                            {getVisibleColumns().includes('boqValue') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatCurrency(project.quotedPrice)}
                                                </td>
                                            )}
                                            {getVisibleColumns().includes('negotiated') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatCurrency(project.negotiatedPrice)}
                                                </td>
                                            )}
                                            {getVisibleColumns().includes('actualSpent') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatCurrency(project.amountSpent)}
                                                </td>
                                            )}
                                            {getVisibleColumns().includes('netAmount') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                                    <span className={project.netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                        {formatCurrency(project.netProfitLoss)}
                                                    </span>
                                                </td>
                                            )}
                                            {getVisibleColumns().includes('profitLoss') && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        project.netProfitLoss >= 0 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {project.netProfitLoss >= 0 ? (
                                                            <>
                                                                <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                                                                Profit
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                                                                Loss
                                                            </>
                                                        )}
                                                    </span>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};


export default ProfitLossSummary;
