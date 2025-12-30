import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Printer } from 'lucide-react';
import { customersAPI } from '../../services/api';

const DispatchInvoice = ({ invoiceData = {}, hideDownloadButton = false }) => {
  const invoiceRef = useRef(null);
  const [customerData, setCustomerData] = useState(null);

  const {
    customer = 'QPIVOLTA TECHNOLOGIES PVT LTD',
    projectName = 'Interior Works',
    invoices = [],
    companyName = 'VOOMET',
    companyAddress = {
      line1: 'No. 165, Sy.No.40/1 ,3rd Phase',
      line2: 'Odefenahali Industrial Area, Kasabahobli',
      line3: 'Doddaballapur',
      line4: 'Bangalore'
    },
    companyGSTIN = '29ANZPK9532D22B',
    companyEmail = 'Accounts@voomet.com'
  } = invoiceData;

  // Fetch customer data when customer name is available
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (customer) {
        try {
          const response = await customersAPI.getAll();
          const customers = response.data?.data || response.data || [];
          const foundCustomer = customers.find(c => c.customerName === customer);
          setCustomerData(foundCustomer);
        } catch (error) {
          console.error('Error fetching customer data:', error);
        }
      }
    };
    fetchCustomerData();
  }, [customer]);

  const calculateTotals = () => {
    return invoices.reduce((acc, inv) => ({
      quantity: acc.quantity + (parseFloat(inv.quantity) || 0)
    }), { quantity: 0 });
  };

  const totals = calculateTotals();
  const invoice = invoices[0] || {};

  const formatDate = (dateString) => {
    const date = dateString ? new Date(dateString) : new Date();
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const generatePDF = async () => {
    if (!invoiceRef.current) return;
    const element = invoiceRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    pdf.save(`Dispatch_Invoice_${invoice.voucherNo || 'Doc'}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <style>{`
        @media print { .print-hide { display: none; } }
        .invoice-box { font-family: 'Arial', sans-serif; font-size: 10px; color: black; line-height: 1.2; }
        .border-all { border: 1px solid black; }
        .border-b { border-bottom: 1px solid black; }
        .border-r { border-right: 1px solid black; }
        .font-bold { font-weight: bold; }
      `}</style>

      {!hideDownloadButton && (
        <div className="max-w-[210mm] mx-auto mb-4 flex justify-end gap-2 print-hide">
          <button onClick={generatePDF} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700">
            <Download size={18} /> Export PDF
          </button>
        </div>
      )}

      <div
        ref={invoiceRef}
        className="invoice-box bg-white mx-auto shadow-2xl overflow-hidden"
        style={{ width: '210mm', height: '297mm', padding: '10mm' }}
      >
        <div className="border-all h-full flex flex-col">
          <div className="text-center py-1 font-bold border-b text-sm uppercase">Delivery Challan</div>

          <div className="flex border-b" style={{ minHeight: '140px' }}>
            <div className="w-1/2 border-r p-2">
              <div className="font-bold text-xs uppercase mb-1">{companyName}</div>
              <div>{companyAddress.line1}</div>
              <div>{companyAddress.line2}</div>
              <div>{companyAddress.line3}, {companyAddress.line4}</div>
              <div className="mt-2 font-bold italic">GSTIN/UIN: {companyGSTIN}</div>
              <div>Email: {companyEmail}</div>
            </div>

            <div className="w-1/2 flex flex-col">
              <div className="flex border-b flex-grow">
                <div className="w-1/2 border-r p-1">
                  <div className="text-[9px] text-gray-600">Delivery Chalan No.</div>
                  <div className="font-bold">{invoice.voucherNo || 'VOO/24-25/001'}</div>
                </div>
                <div className="w-1/2 p-1">
                  <div className="text-[9px] text-gray-600">Dated</div>
                  <div className="font-bold">{formatDate(invoice.invoiceDate)}</div>
                </div>
              </div>

              {/* UPDATED SECTION: PO NO & E-WAY BILL */}
              <div className="flex flex-grow border-b">
                <div className="w-1/2 border-r p-1">
                  <div className="text-[9px] text-gray-600">PO No.</div>
                  <div className="font-bold">{invoice.poNo}</div>
                </div>
                <div className="w-1/2 p-1">
                  <div className="text-[9px] text-gray-600">E-Way Bill</div>
                  <div className="font-bold uppercase">{invoice.eWayBill}</div>
                </div>
              </div>

              <div className="flex flex-grow">
                <div className="w-1/2 border-r p-1">
                  <div className="text-[9px] text-gray-600">Vehicle No.</div>
                  <div className="font-bold uppercase">{invoice.vehicleNo}</div>
                </div>
                <div className="w-1/2 p-1">
                  <div className="text-[9px] text-gray-600">Date of Supply</div>
                  <div className="font-bold">{formatDate(invoice.supplyDate)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex border-b" style={{ minHeight: '100px' }}>
            <div className="w-1/2 border-r p-2">
              <div className="text-[9px] mb-1 italic">TO:</div>
              <div className="font-bold uppercase">{customer}</div>
              {customerData ? (
                <>
                  <div>{customerData.address}</div>
                  <div>{customerData.city}, {customerData.state}</div>
                  <div>{customerData.zipCode}, {customerData.country}</div>
                  <div className="mt-1 font-bold">GSTIN/UIN: {customerData.gstinUin || 'Unregistered'}</div>
                </>
              ) : (
                <>
                  <div>{invoice.destination || 'Karnataka'}</div>
                  <div className="mt-1 font-bold">GSTIN/UIN: {invoice.customerGSTIN || 'Unregistered'}</div>
                </>
              )}
              {invoice.contactNo && <div className="mt-1">Contact: {invoice.contactNo}</div>}
            </div>
          </div>

          <div className="flex border-b font-bold text-center bg-gray-50 uppercase text-[9px]">
            <div className="w-[5%] border-r py-1">Sl</div>
            <div className="w-[45%] border-r py-1">Description of Goods</div>
            <div className="w-[30%] border-r py-1">Item Name</div>
            <div className="w-[20%] py-1">Qty</div>
          </div>

          <div className="flex-grow flex flex-col relative">
            {invoices.map((inv, i) => (
              <div key={i} className="flex border-b">
                <div className="w-[5%] border-r p-1 text-center">{i + 1}</div>
                <div className="w-[45%] border-r p-1">
                  <div className="font-bold uppercase">{inv.workCategory || projectName}</div>
                </div>
                <div className="w-[30%] border-r p-1">
                  <div className="font-bold">{inv.partName}</div>
                </div>
                <div className="w-[20%] p-1 text-center font-bold">{inv.quantity || 0} {inv.unit || ''}</div>
              </div>
            ))}
            <div className="flex-grow flex">
              <div className="w-[5%] border-r h-full"></div>
              <div className="w-[45%] border-r h-full"></div>
              <div className="w-[30%] border-r h-full"></div>
              <div className="w-[20%] h-full"></div>
            </div>
          </div>

          <div className="flex border-t border-b font-bold bg-gray-50">
            <div className="w-[80%] border-r p-1 text-right uppercase">Total Quantity</div>
            <div className="w-[20%] p-1 text-center text-sm">{totals.quantity}</div>
          </div>
        </div>
        <div className="text-center text-[8px] mt-1 text-gray-400">This is a computer-generated dispatch document.</div>
      </div>
    </div>
  );
};

export default DispatchInvoice;