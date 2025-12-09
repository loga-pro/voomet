import React, { useState, useEffect } from "react";
import { projectBudgetsAPI } from '../services/api';
import useNotification from '../hooks/useNotification';

const ProfitLossSummary = () => {
    const { showError } = useNotification();
    const [summaryData, setSummaryData] = useState({
        profit: 0,
        loss: 0,
        loading: true
    });

    useEffect(() => {
        fetchBudgets();
    }, []);

    const fetchBudgets = async () => {
        try {
            setSummaryData(prev => ({ ...prev, loading: true }));
            const response = await projectBudgetsAPI.getAll();
            const budgetsData = response.data.budgets || response.data;

            const totalProfit = budgetsData.reduce((sum, budget) =>
                budget.netProfitLoss > 0 ? sum + budget.netProfitLoss : sum, 0
            );

            const totalLoss = Math.abs(budgetsData.reduce((sum, budget) =>
                budget.netProfitLoss < 0 ? sum + budget.netProfitLoss : sum, 0
            ));

            setSummaryData({
                profit: totalProfit,
                loss: totalLoss,
                loading: false
            });
        } catch (error) {
            showError('Failed to fetch project budgets');
            setSummaryData(prev => ({ ...prev, loading: false }));
        }
    };

    if (summaryData.loading) {
        return (
            <div className="w-full bg-white rounded-xl shadow-md p-6 mb-6 flex justify-center items-center">
                <p className="text-gray-500 font-medium">Loading summary...</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-xl shadow-md p-6 mb-6">
            {/* Header */}
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Profit & Loss Overview</h2>

            {/* Profit / Loss Stats */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-blue-700 font-medium">Total Profit</p>
                        <div className="flex items-center gap-1">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                    strokeWidth="2" stroke="white" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
                                </svg>
                            </span>
                            <span className="font-medium text-gray-700">Profit</span>
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-blue-800 mt-1">
                        ₹ {summaryData.profit.toLocaleString("en-IN")}
                    </h3>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-red-700 font-medium">Total Loss</p>
                        <div className="flex items-center gap-1">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-red-500 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                    strokeWidth="2" stroke="white" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l6 6 4-4 8 8" />
                                </svg>
                            </span>
                            <span className="font-medium text-gray-700">Loss</span>
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-red-800 mt-1">
                        ₹ {summaryData.loss.toLocaleString("en-IN")}
                    </h3>
                </div>
            </div>
        </div>
    );
};


export default ProfitLossSummary;
