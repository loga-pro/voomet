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

    // Prepare pages
    const itemsPerPage = 12;
    const pages = [];
    const items = boqData.items || [];

    if (items.length > 0) {
        let k = 0;
        while (k < items.length) {
            pages.push(items.slice(k, k + itemsPerPage));
            k += itemsPerPage;
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
                        fontSize: '12px'
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
                        <div className="text-right text-xs leading-tight">
                            <div className="font-semibold text-gray-600">
                                <p>No.166,Sy.No.40/1 ,</p>
                                <p>3rd Phase Obdenahalli Industrial Area,</p>
                                <p>Kasabahobli Doddaballapur</p>
                            </div>
                            <div className="text-gray-600">Bangalore</div>
                            <div className="text-gray-600">Karnataka, Code : 29</div>
                            <div className="text-gray-600">PIN: 561203</div>
                            <div className="mt-1 text-gray-500 text-xs flex items-center gap-2">
                                <span>Ph: {companyInfo.phone}</span>
                                <span className="text-gray-400">|</span>
                                <span>Email: Accounts@voomet.com</span>
                                <span className="text-gray-400">|</span>
                                <span>Web: {companyInfo.website}</span>
                            </div>
                        </div>
                    </div>

                    {/* Title and Client Info */}
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

                    {/* Quote Table */}
                    <div className="mb-4">
                        <div className="bg-gray-600 text-white p-2 mb-0">
                            <h3 className="font-bold text-center text-sm">DETAILED QUOTATION</h3>
                        </div>

                        <table className="w-full border-collapse border border-blue-800 text-xs">
                            <thead>
                                <tr className="bg-blue-200">
                                    <th className="border border-blue-800 p-2 font-bold text-left">DESCRIPTION</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">SPECIFICATION</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">QUANTITY</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">UNIT TYPE</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">RATE (₹)</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">AMOUNT (₹)</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">REMARKS</th>
                                    <th className="border border-blue-800 p-2 font-bold text-center">IMAGE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Items */}
                                {pageItems && pageItems.map((item, index) => (
                                    <tr key={index}>
                                        <td className="border border-blue-800 p-2 align-top">
                                            <div className="font-medium">{item.partName}</div>
                                        </td>
                                        <td className="border border-blue-800 p-2 text-center align-top">
                                            {item.specification || '-'}
                                        </td>
                                        <td className="border border-blue-800 p-2 text-center align-top font-mono">
                                            {parseFloat(item.numberOfUnits || 0).toLocaleString()}
                                        </td>
                                        <td className="border border-blue-800 p-2 text-center align-top">
                                            {item.unitType}
                                        </td>
                                        <td className="border border-blue-800 p-2 text-right align-top font-mono">
                                            {parseFloat(item.unitPrice || 0).toLocaleString('en-IN', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </td>
                                        <td className="border border-blue-800 p-2 text-right align-top font-mono font-semibold">
                                            {parseFloat(item.totalPrice || 0).toLocaleString('en-IN', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </td>
                                        <td className="border border-blue-800 p-2 text-right align-top font-mono font-semibold">
                                            {item.remarks || " "}
                                        </td>
                                        <td className="border border-blue-800 p-2 text-center align-top">
                                            {getImageUrl(item.image) && (
                                                <img
                                                    src={getImageUrl(item.image)}
                                                    alt="Item"
                                                    className="h-16 w-16 object-contain mx-auto"
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
                                <div className="text-xs font-medium mb-1">SUBTOTAL (Excl. GST)</div>
                                <div className="text-lg font-bold font-mono">
                                    ₹{finalTotalWithoutGST.toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="p-3 border-r border-blue-600 text-center">
                                <div className="text-xs font-medium mb-1">Discount - ({discountPercentage}) %</div>
                                <div className="text-lg font-bold font-mono">
                                    ₹{(discountAmount || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="p-3 border-r border-blue-600 text-center">
                                <div className="text-xs font-medium mb-1">GST @ {boqData.gstPercentage}%</div>
                                <div className="text-lg font-bold font-mono text-yellow-300">
                                    ₹{((totalWithGST - (finalTotalWithoutGST - (discountAmount || 0))) || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="p-3 text-center bg-green-600">
                                <div className="text-xs font-medium mb-1">GRAND TOTAL</div>
                                <div className="text-xl font-bold font-mono">
                                    ₹{(totalWithGST || 0)?.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>}

                    {/* Footer */}
                    <div className="mt-6 pt-3 border-t text-center text-xs text-blue-600">
                        <p className="font-medium">This is a system generated quotation - {currentDate} - Page {pageIndex + 1} of {pages.length}</p>
                        <p className="mt-1">Thank you for choosing {companyInfo.name} for your interior design needs!</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BOQPDFPreview;
