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

    // Prepare pages with smart weight-based pagination
    const pages = [];
    const items = boqData.items || [];
    const maxLoad = 24; // Average items per page based on weight

    if (items.length > 0) {
        let currentPageItems = [];
        let currentLoad = 0;

        items.forEach((item) => {
            const descLength = item.partName?.length || 0;
            const specLength = item.specification?.length || 0;
            const remarksLength = item.remarks?.length || 0;

            const maxTextLength = Math.max(descLength, specLength, remarksLength);
            const estimatedLines = Math.ceil(maxTextLength / 35);
            const weight = Math.max(2.0, (estimatedLines * 0.9) + (item.image ? 4.5 : 0));

            // Determine if we need to break. The first page has a larger header (BOQ Title + Client Info)
            // Header weight for first page is approx 10.
            const currentPageCapacity = (pages.length === 0) ? (maxLoad - 10) : maxLoad;

            if (currentLoad + weight > currentPageCapacity && currentPageItems.length > 0) {
                pages.push(currentPageItems);
                currentPageItems = [];
                currentLoad = 0;
            }

            currentPageItems.push(item);
            currentLoad += weight;
        });

        if (currentPageItems.length > 0) {
            pages.push(currentPageItems);
        }
    } else {
        pages.push([]);
    }

    return (
        <div className="bg-gray-100 overflow-auto max-h-[600px]">
            {pages.map((pageItems, pageIndex) => (
                <div
                    key={pageIndex}
                    className="bg-white p-6 shadow-lg mx-auto mb-8 boq-pdf-page"
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
                                alt="Company Logo"
                                className="h-16 w-auto max-w-32 object-contain"
                                style={{
                                    imageRendering: 'crisp-edges',
                                    maxHeight: '64px'
                                }}
                                crossOrigin="anonymous"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    const fallback = document.createElement('div');
                                    fallback.className = 'h-16 w-16 bg-blue-200 flex items-center justify-center rounded';
                                    fallback.innerHTML = '<span class="text-blue-600 font-bold text-lg">V</span>';
                                    e.target.parentNode.appendChild(fallback);
                                }}
                            />
                        </div>
                        <div className="text-right text-sm leading-tight">
                            <div className="font-semibold text-gray-600">
                                <p>No.166,Sy.No.40/1 ,</p>
                                <p>3rd Phase Obdenahalli Industrial Area,</p>
                                <p>Kasabahobli Doddaballapur</p>
                            </div>
                            <div className="text-gray-600">Bangalore</div>
                            <div className="text-gray-600">Karnataka, Code : 29</div>
                            <div className="text-gray-600">PIN: 561203</div>
                            <div className="mt-1 text-gray-500 text-sm flex items-center gap-2">
                                <span>Ph: {companyInfo.phone}</span>
                                <span className="text-gray-400">|</span>
                                <span>Email: Accounts@voomet.com</span>
                                <span className="text-gray-400">|</span>
                                <span>Web: {companyInfo.website}</span>
                            </div>
                        </div>
                    </div>

                    {/* Title and Client Info - Only on first page */}
                    {pageIndex === 0 && (
                        <div className="mb-6">
                            <div className="bg-blue-800 text-white p-3 mb-4">
                                <h2 className="text-lg font-bold text-center">BILL OF QUANTITIES (BOQ)</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-4">
                                <div className="space-y-2">
                                    <div className="flex">
                                        <span className="font-bold w-28 text-sm">CLIENT NAME:</span>
                                        <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">{boqData.customer}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-28 text-sm">LOCATION:</span>
                                        <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">{boqData.location || 'Bangalore'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-28 text-sm">PROJECT:</span>
                                        <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">{projectName || 'Interior Design'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex">
                                        <span className="font-bold w-28 text-sm">ESTIMATE :</span>
                                        <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm font-mono">{boqCode}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-28 text-sm">DATE:</span>
                                        <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">{currentDate}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quote Table */}
                    <div className="mb-4">
                        <div className="bg-gray-600 text-white p-2 mb-0">
                            <h3 className="font-bold text-center text-sm">DETAILED QUOTATION</h3>
                        </div>

                        <table className="w-full border-collapse border border-blue-800 text-sm">
                            <thead>
                                <tr className="bg-blue-200">
                                    <th className="border border-blue-800 p-2 font-bold text-left">DESCRIPTION</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">SPECIFICATION</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">QUANTITY</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">UNIT TYPE</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">RATE (₹)</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">AMOUNT (₹)</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center w-40">REMARKS / IMAGE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Items */}
                                {pageItems && pageItems.map((item, index) => (
                                    <tr key={index}>
                                        <td className="border border-blue-800 p-3 align-top">
                                            <div className="font-bold mb-1 text-xs">{item.partName}</div>
                                        </td>
                                        <td className="border border-blue-800 p-3 text-center align-top leading-relaxed">
                                            {item.specification || '-'}
                                        </td>
                                        <td className="border border-blue-800 p-3 text-center align-middle font-mono">
                                            {parseFloat(item.numberOfUnits || 0).toLocaleString()}
                                        </td>
                                        <td className="border border-blue-800 p-3 text-center align-middle">
                                            {item.unitType}
                                        </td>
                                        <td className="border border-blue-800 p-3 text-right align-middle font-mono">
                                            {parseFloat(item.unitPrice || 0).toLocaleString('en-IN', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </td>
                                        <td className="border border-blue-800 p-3 text-right align-middle font-mono font-semibold">
                                            {parseFloat(item.totalPrice || 0).toLocaleString('en-IN', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </td>
                                        <td className="border border-blue-800 p-3 text-left align-top">
                                            <div className="mb-3 leading-relaxed">{item.remarks || " "}</div>
                                            {getImageUrl(item.image) && (
                                                <img
                                                    src={getImageUrl(item.image)}
                                                    alt="Item"
                                                    className="w-full h-auto max-h-40 object-contain rounded-md border border-gray-200 shadow-sm"
                                                    crossOrigin="anonymous"
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {/* Transportation Charges Row - Only on last page */}
                                {pageIndex === pages.length - 1 && transportationCharges > 0 && (
                                    <tr className="bg-blue-50">
                                        <td className="border border-blue-800 p-2 font-medium" colSpan="5">
                                            Transportation & Handling Charges
                                        </td>
                                        <td className="border border-blue-800 p-2 text-right font-mono font-semibold">
                                            {transportationCharges.toLocaleString('en-IN', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Section - Only on Last Page */}
                    {pageIndex === pages.length - 1 && <div className="bg-blue-800 text-white mb-4">
                        <div className="grid grid-cols-4">
                            <div className="p-3 border-r border-blue-600 text-center">
                                <div className="text-sm font-medium mb-1">SUBTOTAL (Excl. GST)</div>
                                <div className="text-lg font-bold font-mono">
                                    ₹{finalTotalWithoutGST.toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="p-3 border-r border-blue-600 text-center">
                                <div className="text-sm font-medium mb-1">Discount - ({discountPercentage}) %</div>
                                <div className="text-lg font-bold font-mono">
                                    ₹{(discountAmount || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="p-3 border-r border-blue-600 text-center">
                                <div className="text-sm font-medium mb-1">GST @ {boqData.gstPercentage}%</div>
                                <div className="text-lg font-bold font-mono text-yellow-300">
                                    ₹{((totalWithGST - (finalTotalWithoutGST - (discountAmount || 0))) || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="p-3 text-center bg-green-600">
                                <div className="text-sm font-medium mb-1">GRAND TOTAL</div>
                                <div className="text-xl font-bold font-mono">
                                    ₹{(totalWithGST || 0)?.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>}

                    {/* Footer */}
                    <div className="mt-6 pt-3 border-t text-center text-sm text-blue-600">
                        <p className="font-medium">This is a system generated quotation - {currentDate} - Page {pageIndex + 1} of {pages.length}</p>
                        <p className="mt-1">Thank you for choosing {companyInfo.name} for your interior design needs!</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BOQPDFPreview;
