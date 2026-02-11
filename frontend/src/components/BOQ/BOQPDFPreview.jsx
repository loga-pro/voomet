import React, { useState, useRef, useEffect } from 'react';
import { projectsAPI, API_BASE_URL } from '../../services/api';

const BOQPDFPreview = ({ boqData }) => {
    const [companyInfo] = useState({
        name: 'VOOMET',
        address: 'P-31, GRTC, Mandi, Armsul Park',
        city: 'Siddarthanagara, Kartarpet-561203',
        state: 'Karnataka',
        pincode: '561203',
        phone: '+91 90450 76578',
        email: 'info@voomet.com',
        website: 'www.voomet.com',
    });

    const [projectName, setProjectName] = useState('');

    // Fetch projects and find matching project name
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await projectsAPI.getAll();
                const allProjects = response.data || [];

                // Find project matching the customer
                const matchingProject = allProjects.find(
                    project => project.customerName === boqData.customer
                );

                if (matchingProject) {
                    setProjectName(matchingProject.projectName);
                }
            } catch (error) {
                console.error('Error fetching projects:', error);
            }
        };

        fetchProjects();
    }, [boqData.customer]);

    const generateBOQCode = () => {
        if (boqData.estimateNumber && boqData.estimateNumber.trim() !== '') {
            return boqData.estimateNumber;
        }
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        return `VOO/${randomNum}/${day}${month}${year}`;
    };

    const currentDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const boqCode = generateBOQCode();

    const getImageUrl = (image) => {
        if (!image) return null;
        if (typeof image === 'string') {
            if (image.startsWith('http')) return image;
            const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
            return `${baseUrl}${image}`;
        }
        if (!image.path) return null;

        const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
        return `${baseUrl}${image.path}`;
    };

    // Calculate totals
    const itemsTotal = boqData.items?.reduce((sum, item) => {
        return sum + (parseFloat(item.totalPrice) || 0);
    }, 0) || 0;

    const transportationCharges = parseFloat(boqData.transportationCharges) || 0;
    const finalTotalWithoutGST = itemsTotal + transportationCharges;
    const totalWithGST = boqData.totalWithGST;
    const discountPercentage = boqData.discountPercentage;
    const discountAmount = boqData.discountAmount;

    // Calculate scope totals for summary
    const normalizeScope = (scope) => (scope || 'Uncategorized').toLowerCase().trim().replace(/_/g, ' ');
    const selectedScopes = Array.from(new Set((boqData.items || []).map(i => i.scopeOfWork)))
        .filter(Boolean)
        .sort();

    const scopeTotals = {};
    selectedScopes.forEach(scope => {
        const scopeItems = (boqData.items || []).filter(i =>
            normalizeScope(i.scopeOfWork) === normalizeScope(scope)
        );
        scopeTotals[scope] = scopeItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
    });

    // Prepare pages with smart weight-based pagination
    const pages = [];
    const maxLoad = 28;

    if (selectedScopes.length > 0) {
        let currentBlocks = [];
        let currentLoad = 0;

        const addBlock = (block, weight) => {
            if (currentLoad + weight > maxLoad) {
                // Don't break if it's just a header
                const isOnlyHeader = currentBlocks.length === 1 && currentBlocks[0].type === 'scope_header';
                if (currentBlocks.length > 0 && !isOnlyHeader) {
                    pages.push(currentBlocks);
                    currentBlocks = [];
                    currentLoad = 0;
                }
            }
            currentBlocks.push(block);
            currentLoad += weight;
        };

        const forceNewPage = () => {
            if (currentBlocks.length > 0) {
                pages.push(currentBlocks);
                currentBlocks = [];
                currentLoad = 0;
            }
        };

        selectedScopes.forEach((scope) => {
            // Force a new page for each "DETAILED QUOTATION - [SCOPE]" section
            forceNewPage();

            const scopeItems = (boqData.items || []).filter(i =>
                normalizeScope(i.scopeOfWork) === normalizeScope(scope)
            );

            if (scopeItems.length > 0) {
                // Scope Header
                addBlock({ type: 'scope_header', scope }, 2);

                scopeItems.forEach((item, idx) => {
                    const descLength = item.partName?.length || 0;
                    const specLength = item.specification?.length || 0;
                    const remarksLength = item.remarks?.length || 0;

                    const maxTextLength = Math.max(descLength, specLength, remarksLength);
                    const estimatedLines = Math.ceil(maxTextLength / 65);
                    const weight = Math.max(1.5, (estimatedLines * 0.7) + (item.image ? 4.0 : 0));

                    // Keeping total with last item logic
                    const isLast = idx === scopeItems.length - 1;
                    const upcomingWeight = isLast ? (weight + 1 + 1.5) : weight;

                    if (currentLoad + upcomingWeight > maxLoad && currentBlocks.length > 0) {
                        const isOnlyHeader = currentBlocks.length === 1 && currentBlocks[0].type === 'scope_header';
                        if (!isOnlyHeader) {
                            forceNewPage();
                        }
                    }

                    addBlock({ type: 'item_row', item, index: idx + 1, scope }, weight);
                });

                // Add Spacer and Total for scope
                addBlock({ type: 'spacer' }, 0.5);
                addBlock({ type: 'scope_total', total: scopeTotals[scope], scope }, 1.5);
            }
        });

        if (currentBlocks.length > 0) {
            pages.push(currentBlocks);
        }
    } else {
        pages.push([]);
    }

    const totalPages = pages.length + 1; // Summary page + Detailed pages

    return (
        <div className="bg-gray-100 overflow-auto max-h-[600px]">
            {/* 1. Summary Page */}
            <div
                className="bg-white p-6 shadow-lg mx-auto mb-8 boq-pdf-page relative"
                style={{
                    width: '210mm',
                    minHeight: '297mm',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '14px'
                }}
            >
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-blue-900">
                    <div className="flex items-center space-x-4">
                        <img
                            src={'/images/voomet-logo.png'}
                            alt="VOOMET Logo"
                            className="h-16 w-16 object-contain"
                        />
                        <div>
                            <h1 className="text-3xl font-black text-blue-900 tracking-tighter">VOOMET</h1>
                            <p className="text-[10px] text-gray-500 font-bold tracking-widest leading-none">BUILDING DREAMS</p>
                        </div>
                    </div>
                    <div className="text-right text-[11px] text-gray-600 leading-tight">
                        <p className="font-bold text-gray-800">No.166,Sy.No.40/1 ,</p>
                        <p>3rd Phase Obdenahalli Industrial Area,</p>
                        <p>Kasabahobli Doddaballapur, Bangalore</p>
                        <p>Karnataka, Code : 29</p>
                        <p className="mt-1 font-bold">PIN: 561203</p>
                    </div>
                </div>

                <div className="text-center mb-6 py-2 bg-blue-50 border-y border-blue-200">
                    <h2 className="text-lg font-bold text-blue-900 uppercase tracking-widest">Summary of BOQ</h2>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6">
                    <div className="space-y-2">
                        <div className="flex">
                            <span className="font-bold w-28 text-xs">CLIENT NAME:</span>
                            <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-xs">{boqData.customer}</span>
                        </div>
                        <div className="flex">
                            <span className="font-bold w-28 text-xs">LOCATION:</span>
                            <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-xs">{boqData.location || 'Bangalore'}</span>
                        </div>
                        <div className="flex">
                            <span className="font-bold w-28 text-xs">PROJECT:</span>
                            <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-xs">{projectName || 'Interior Design'}</span>
                        </div>
                    </div>
                    <div className="space-y-2 text-right">
                        <div className="flex justify-end">
                            <span className="font-bold w-28 text-xs text-left uppercase">Estimate :</span>
                            <span className="w-32 border-b border-dotted border-gray-400 pb-1 text-xs font-mono text-left">{boqCode}</span>
                        </div>
                        <div className="flex justify-end">
                            <span className="font-bold w-28 text-xs text-left uppercase">Date:</span>
                            <span className="w-32 border-b border-dotted border-gray-400 pb-1 text-xs text-left">{currentDate}</span>
                        </div>
                    </div>
                </div>

                {/* Summary Table */}
                <table className="w-full border-collapse border border-blue-800 text-sm mb-6">
                    <thead>
                        <tr className="bg-blue-100">
                            <th className="border border-blue-800 p-2 font-bold text-center w-12">S.NO</th>
                            <th className="border border-blue-800 p-2 font-bold text-left">SCOPE OF WORK</th>
                            <th className="border border-blue-800 p-2 font-bold text-right w-36">AMOUNT (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedScopes.map((scope, idx) => (
                            <tr key={idx}>
                                <td className="border border-blue-800 p-2 text-center">{idx + 1}</td>
                                <td className="border border-blue-800 p-2 font-medium">{scope.replace(/_/g, ' ').toUpperCase()}</td>
                                <td className="border border-blue-800 p-2 text-center font-mono">
                                    {scopeTotals[scope].toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-blue-50 font-bold">
                            <td className="border border-blue-800 p-2 text-center" colSpan="2">TOTAL (SUBTOTAL)</td>
                            <td className="border border-blue-800 p-2 text-center font-mono">
                                {itemsTotal.toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Totals Section */}
                <div className="bg-blue-800 text-white mb-6 shadow-sm">
                    <div className="grid grid-cols-4">
                        <div className="p-3 border-r border-blue-600 text-center">
                            <div className="text-[10px] uppercase font-medium mb-1 opacity-80">Subtotal</div>
                            <div className="text-sm font-bold font-mono">
                                ₹{finalTotalWithoutGST.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className="p-3 border-r border-blue-600 text-center">
                            <div className="text-[10px] uppercase font-medium mb-1 opacity-80">Discount ({discountPercentage}%)</div>
                            <div className="text-sm font-bold font-mono text-blue-100">
                                ₹{(discountAmount || 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className="p-3 border-r border-blue-600 text-center">
                            <div className="text-[10px] uppercase font-medium mb-1 opacity-80">GST ({boqData.gstPercentage}%)</div>
                            <div className="text-sm font-bold font-mono text-yellow-300">
                                ₹{((totalWithGST - (finalTotalWithoutGST - (discountAmount || 0))) || 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className="p-3 text-center bg-blue-900 border-l border-blue-600">
                            <div className="text-[10px] uppercase font-bold mb-1 text-blue-200">Grand Total</div>
                            <div className="text-lg font-black font-mono">
                                ₹{(totalWithGST || 0)?.toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Remarks & Terms */}
                {boqData.overallRemarks && (
                    <div className="mb-4 text-[11px] text-gray-700 italic border-l-2 border-blue-800 pl-3">
                        <span className="font-bold text-blue-900 not-italic mr-2">REMARKS:</span> {boqData.overallRemarks}
                    </div>
                )}

                {boqData.termsAndConditions && boqData.termsAndConditions.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-bold text-xs text-blue-900 mb-1 border-b border-blue-100 inline-block">TERMS & CONDITIONS:</h4>
                        <ul className="list-disc list-inside text-[10px] text-gray-600 space-y-0.5">
                            {boqData.termsAndConditions.map((term, i) => (
                                <li key={i}>{term}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Floating Footer */}
                <div className="mt-auto pt-4 border-t text-center text-[11px] text-blue-700 absolute bottom-6 left-6 right-6">
                    <p className="font-medium tracking-wide">This is a system generated quotation - {currentDate} - Page 1 of {totalPages}</p>
                    <p className="mt-0.5 opacity-80 underline underline-offset-2">www.voomet.com</p>
                </div>
            </div>

            {/* 2. Detailed Pages */}
            {pages.map((pageItems, pageIndex) => (
                <div
                    key={pageIndex}
                    className="bg-white p-6 shadow-lg mx-auto mb-8 boq-pdf-page relative"
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '14px'
                    }}
                >
                    {/* Header Section (Minimal on detailed pages) */}
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-xl font-black text-blue-900 tracking-tighter">VOOMET</h1>
                        </div>
                        <div className="text-right text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            Detailed Quotation Breakdown
                        </div>
                    </div>



                    {/* Main Content Area */}
                    {/* Main Content Area */}
                    <div className="flex-1">
                        <table className="w-full border-collapse border border-blue-800 text-sm mb-0">
                            <thead>
                                <tr className="bg-blue-200">
                                    <th className="border border-blue-800 p-2 font-bold text-left">DESCRIPTION</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center w-[50px] text-[10px]">SPEC<br />IFICATION</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center w-[35px] text-[10px]">QTY</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center w-[35px] text-[10px]">UNIT TYPE</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center w-[70px] text-[10px]">RATE<br />(₹)</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center w-[85px] text-[10px]">AMOUNT<br />(₹)</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center w-[100px] text-[10px]">REMARKS /<br />IMAGE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageItems.map((block, bIdx) => {
                                    if (block.type === 'scope_header') {
                                        return (
                                            <tr key={bIdx} className="bg-blue-800 text-white font-bold">
                                                <td colSpan="7" className="border border-blue-800 p-2 text-center uppercase tracking-widest text-xs">
                                                    DETAILED QUOTATION - {block.scope.replace(/_/g, ' ').toUpperCase()}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    if (block.type === 'item_row') {
                                        return (
                                            <tr key={bIdx}>
                                                <td className="border border-blue-800 p-2 text-left align-top leading-tight">
                                                    <div className="text-[11px] font-medium">{block.item.partName}</div>
                                                </td>
                                                <td className="border border-blue-800 p-2 text-left align-top leading-tight text-[10px]">
                                                    {block.item.specification || '-'}
                                                </td>
                                                <td className="border border-blue-800 p-2 text-center align-middle font-mono text-[10px]">
                                                    {parseFloat(block.item.numberOfUnits || 0).toLocaleString()}
                                                </td>
                                                <td className="border border-blue-800 p-2 text-center align-middle text-[10px]">
                                                    {block.item.unitType}
                                                </td>
                                                <td className="border border-blue-800 p-2 text-right align-middle font-mono text-[10px]">
                                                    {parseFloat(block.item.unitPrice || 0).toLocaleString('en-IN', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </td>
                                                <td className="border border-blue-800 p-2 text-right align-middle font-mono font-semibold text-[10px]">
                                                    {parseFloat(block.item.totalPrice || 0).toLocaleString('en-IN', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </td>
                                                <td className="border border-blue-800 p-2 text-left align-top text-[10px]">
                                                    <div className="mb-2 leading-tight">{block.item.remarks || " "}</div>
                                                    {getImageUrl(block.item.image) && (
                                                        <img
                                                            src={getImageUrl(block.item.image)}
                                                            alt="Item"
                                                            className="w-full h-auto max-h-32 object-contain rounded-md border border-gray-200"
                                                            crossOrigin="anonymous"
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    if (block.type === 'scope_total') {
                                        return (
                                            <tr key={bIdx} className="bg-blue-100 font-bold">
                                                <td className="border border-blue-800 p-3 text-right" colSpan="5">
                                                    TOTAL {block.scope.replace(/_/g, ' ').toUpperCase()}
                                                </td>
                                                <td className="border border-blue-800 p-3 text-center font-mono">
                                                    ₹{block.total.toLocaleString('en-IN', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </td>
                                                <td className="border border-blue-800 p-3"></td>
                                            </tr>
                                        );
                                    }

                                    if (block.type === 'spacer') {
                                        return (
                                            <tr key={bIdx} className="h-2">
                                                <td colSpan="7" className="border-none"></td>
                                            </tr>
                                        );
                                    }

                                    return null;
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer - Index starts from page 2 */}
                    <div className="mt-auto pt-3 border-t text-center text-sm text-blue-600 absolute bottom-6 left-6 right-6">
                        <p className="font-medium">This is a system generated quotation - {currentDate} - Page {pageIndex + 2} of {totalPages}</p>
                        <p className="mt-1">Thank you for choosing {companyInfo.name} for your interior design needs!</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BOQPDFPreview;
