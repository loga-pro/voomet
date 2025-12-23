import React, { useState, useEffect } from 'react';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    PencilSquareIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';

const InhousePartMaster = () => {
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const { notification, showSuccess, showError, hideNotification } = useNotification();

    useEffect(() => {
        fetchParts();
    }, []);

    const fetchParts = async () => {
        try {
            setLoading(true);
            // TODO: Replace with actual API call
            // const response = await inhousePartAPI.getAll();
            // setParts(response.data || []);

            // Sample data for demonstration
            setParts([
                {
                    _id: '1',
                    partNumber: 'IHP-001',
                    partName: 'Custom Bracket',
                    category: 'Mechanical',
                    material: 'Steel',
                    quantity: 150,
                    unit: 'pcs',
                    location: 'Warehouse A',
                    status: 'Available'
                },
                {
                    _id: '2',
                    partNumber: 'IHP-002',
                    partName: 'Custom Gear',
                    category: 'Mechanical',
                    material: 'Aluminum',
                    quantity: 75,
                    unit: 'pcs',
                    location: 'Warehouse B',
                    status: 'Low Stock'
                }
            ]);
        } catch (error) {
            console.error('Error fetching parts:', error);
            showError('Failed to fetch inhouse parts');
        } finally {
            setLoading(false);
        }
    };

    const filteredParts = parts.filter(part =>
        part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredParts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredParts.length / itemsPerPage);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Available':
                return 'bg-green-100 text-green-800';
            case 'Low Stock':
                return 'bg-yellow-100 text-yellow-800';
            case 'Out of Stock':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 p-2 sm:p-4 lg:p-6 xl:p-8">
            <Notification
                message={notification.message}
                type={notification.type}
                isVisible={notification.isVisible}
                onClose={hideNotification}
            />

            <div className="max-w-none w-full">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0 sm:space-x-3">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Search parts..."
                                />
                            </div>

                            <button
                                onClick={() => showSuccess('Add new part feature coming soon!')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <PlusIcon className="h-5 w-5 mr-2" />
                                New Part
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Part Number
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                             Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Material
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Quantity
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Location
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((part) => (
                                            <tr key={part._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{part.partNumber}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{part.partName}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{part.category}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{part.material}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{part.quantity} {part.unit}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{part.location}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(part.status)}`}>
                                                        {part.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => showSuccess('View feature coming soon!')}
                                                            className="text-blue-600 hover:text-blue-900 p-1"
                                                            title="View Details"
                                                        >
                                                            <EyeIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => showSuccess('Edit feature coming soon!')}
                                                            className="text-indigo-600 hover:text-indigo-900 p-1"
                                                            title="Edit"
                                                        >
                                                            <PencilSquareIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => showError('Delete feature coming soon!')}
                                                            className="text-red-600 hover:text-red-900 p-1"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                                                No inhouse parts found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {filteredParts.length > 0 && (
                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="flex items-center">
                                <span className="text-sm text-gray-700">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredParts.length)} of {filteredParts.length} results
                                </span>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeftIcon className="h-5 w-5" />
                                </button>
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRightIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InhousePartMaster;
