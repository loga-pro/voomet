import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Printer, Download, FileText, Building2, Banknote } from 'lucide-react';

const Purchase = ({ invoiceData = {}, hideDownloadButton = false }) => {
  const invoiceRef = useRef(null);

  // Extract data from props with fallback values
  const {
    customer = 'QPIVOLTA TECHNOLOGIES PVT LTD',
    projectName = '',
    projectCost = 0,
    invoices = [],
    // Company details (seller) - UPDATED FROM IMAGE
    companyName = 'VOOMET',
    companyAddress = {
      line1: 'No. 165, Sy.No.40/1 ,3rd Phase',
      line2: 'Odefenahali Industrial Area, Kasabahobli',
      line3: 'Doddaballapur',
      line4: 'Bangalore'
    },
    companyGSTIN = '29ANZPK9532D22B',
    companyState = 'Karnataka',
    companyStateCode = '29',
    companyEmail = 'Accounts@voomet.com',
    // Bank details
    bankDetails = {
      accountHolder: 'VOOMET',
      bankName: 'State Bank of India',
      accountNumber: '43395372560',
      branch: 'BSF Yelahanka',
      ifscCode: 'SBIN0063847'
    }
  } = invoiceData;

  // Calculate totals from all invoices
  const calculateTotals = () => {
    if (invoices.length === 0) return { invoiceValue: 0, cgstAmount: 0, sgstAmount: 0, roundOff: 0, totalQuantity: 0 };

    return invoices.reduce((acc, inv) => {
      let invTotalQty = 0;
      let invSubTotal = 0;

      // Calculate from lineItems if available
      if (inv.lineItems && inv.lineItems.length > 0) {
        inv.lineItems.forEach(item => {
          const qty = parseFloat(item.quantity) || 0;
          // Handle both frontend state naming and backend model naming
          const price = parseFloat(item.priceWithoutGST || item.invoiceValueWithoutGST) || 0;

          invTotalQty += qty;
          invSubTotal += (qty * price);
        });
      } else {
        // Fallback if no line items (flat invoice structure)
        const qty = parseFloat(inv.quantity) || 0;
        const price = parseFloat(inv.priceWithoutGST || inv.invoiceValueWithoutGST) || 0;

        invTotalQty = qty;
        invSubTotal = qty * price;

        // If calculated subtotal is 0, try using explicit invoiceValue field if present
        if (invSubTotal === 0) {
          invSubTotal = parseFloat(inv.invoiceValue || inv.invoiceValueWithoutGST) || 0;
        }
      }

      // Calculate Taxes based on item-level GST percentages
      let cgstVal = 0;
      let sgstVal = 0;

      if (inv.lineItems && inv.lineItems.length > 0) {
        // Calculate GST for each line item
        inv.lineItems.forEach(item => {
          const qty = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.priceWithoutGST || item.invoiceValueWithoutGST) || 0;
          const itemTotal = qty * price;
          const itemGstPercent = parseFloat(item.gstPercentage) || 0;

          // Use invoice-level CGST/SGST if available, otherwise split item GST equally
          const cgstPercent = parseFloat(inv.cgst) || (itemGstPercent / 2);
          const sgstPercent = parseFloat(inv.sgst) || (itemGstPercent / 2);

          cgstVal += (itemTotal * cgstPercent) / 100;
          sgstVal += (itemTotal * sgstPercent) / 100;
        });
      } else {
        // Fallback to invoice-level percentages for non-line-item invoices
        const cgstPercent = parseFloat(inv.cgst) || 0;
        const sgstPercent = parseFloat(inv.sgst) || 0;
        cgstVal = (invSubTotal * cgstPercent) / 100;
        sgstVal = (invSubTotal * sgstPercent) / 100;
      }

      return {
        invoiceValue: acc.invoiceValue + invSubTotal,
        cgstAmount: acc.cgstAmount + cgstVal,
        sgstAmount: acc.sgstAmount + sgstVal,
        roundOff: acc.roundOff + (parseFloat(inv.roundOff) || 0),
        totalQuantity: acc.totalQuantity + invTotalQty
      };
    }, { invoiceValue: 0, cgstAmount: 0, sgstAmount: 0, roundOff: 0, totalQuantity: 0 });
  };

  const totals = calculateTotals();
  // Get the first invoice for reference data (voucher, date, etc.)
  const invoice = invoices.length > 0 ? invoices[0] : {};

  // Use calculated totals
  const invoiceValue = totals.invoiceValue;
  const cgstAmount = totals.cgstAmount;
  const sgstAmount = totals.sgstAmount;
  const roundOff = totals.roundOff;
  const totalQuantity = totals.totalQuantity;
  const totalWithTax = invoiceValue + cgstAmount + sgstAmount + roundOff;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  // Convert number to words (Indian numbering system)
  const numberToWords = (num) => {
    if (!num || num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    let result = '';
    if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
    if (remainder > 0) result += convertLessThanThousand(remainder);

    return result.trim();
  };

  const amountInWords = `INR ${numberToWords(Math.floor(totalWithTax))} Only`;

  const generatePDF = async () => {
    if (!invoiceRef.current) return;

    const element = invoiceRef.current;

    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = 210;
      const pdfHeight = 297;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Voomet_Proforma_Invoice_${invoice.voucherNo || new Date().getTime()}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <style>{`
        @media print {
          body {
            background: none !important;
          }
          .print-hide {
            display: none !important;
          }
          .a4-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
          }
          .invoice-wrapper {
            display: block !important;
            margin: 0 !important;
          }
          .container-outer {
            padding: 0 !important;
          }
        }
        
        /* Font styles for invoice */
        .invoice-content {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 11px;
          line-height: 1.3;
        }
        
        .invoice-bold {
          font-weight: bold;
        }
        
        .invoice-small {
          font-size: 10px;
        }
        
        .invoice-xsmall {
          font-size: 9px;
        }
        
        .invoice-xxsmall {
          font-size: 8px;
        }
      `}</style>

      {/* Professional Header */}
      <div className="max-w-7xl mx-auto">

        {/* Action Bar */}
        {!hideDownloadButton && (
          <div className="print-hide mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex justify-end">
                <button
                  onClick={generatePDF}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Preview Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 mb-8">

          {/* Invoice Container */}
          <div className="p-4 md:p-6">
            <div className="overflow-auto max-w-full">
              <div className="flex justify-center">
                <div
                  ref={invoiceRef}
                  id="invoiceContent"
                  className="bg-white text-black relative a4-page invoice-content"
                  style={{
                    width: '210mm',
                    height: '297mm',
                    padding: '10mm',
                    boxSizing: 'border-box',
                    lineHeight: 1.3,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                >
                  {/* Content Wrapper with Border */}
                  <div className="border border-black h-full flex flex-col">

                    {/* Header: Title */}
                    <h1 className="text-center font-bold text-sm py-1 border-b border-black tracking-wide">
                      Purchase Order
                    </h1>

                    {/* Top Section: Buyer/Seller Info */}
                    <div className="flex border-b border-black">
                      {/* Left Column: Addresses */}
                      <div className="w-1/2 border-r border-black flex flex-col">

                        {/* Seller - UPDATED FROM IMAGE */}
                        <div className="p-2 flex-grow">
                          <div className="font-bold text-xs">{companyName}</div>
                          <div>{companyAddress.line1}</div>
                          <div>{companyAddress.line2}</div>
                          <div>{companyAddress.line3}</div>
                          <div>{companyAddress.line4}</div>
                          <div className="mt-1">GSTIN/UIN : {companyGSTIN}</div>
                          <div>State Name : {companyState}, Code : {companyStateCode}</div>
                          <div>E-Mail : {companyEmail}</div>
                        </div>

                        {/* Consignee */}
                        <div className="border-t border-black p-2 flex-grow invoice-small">
                          <div className="mb-1">Supplier (Bill from)</div>
                          {invoice.supplier ? (
                            <div className="whitespace-pre-wrap text-xs">{invoice.supplier}</div>
                          ) : (
                            <>
                              <div className="font-bold">{customer}</div>
                              <div>{invoice.destination || 'As per order'}</div>
                              <div className="mt-1">GSTIN/UIN : {invoice.customerGSTIN || ''}</div>
                              <div>State Name : {companyState}, Code : {companyStateCode}</div>
                            </>
                          )}
                        </div>


                      </div>

                      {/* Right Column: Invoice Details */}
                      <div className="w-1/2 flex flex-col">
                        <div className="flex border-b border-black">
                          <div className="w-1/2 p-2 border-r border-black">
                            <div className="invoice-small">Voucher No.</div>
                            <div className="font-bold">{invoice.voucherNo || invoice.invoiceNumber}</div>
                          </div>
                          <div className="w-1/2 p-2">
                            <div className="invoice-small">Dated</div>
                            <div className="font-bold">{formatDate(invoice.invoiceDate)}</div>
                          </div>
                        </div>

                        <div className="flex border-b border-black">
                          <div className="w-1/2 p-2 border-r border-black">
                            <div className="invoice-small">Refrence No. & Date</div>
                            <div className="font-bold">
                              {invoice.referenceNo || ''}
                              {invoice.referenceNo && invoice.referenceDate ? ' & ' : ''}
                              {invoice.referenceDate ? formatDate(invoice.referenceDate) : ''}
                              {!invoice.referenceNo && !invoice.referenceDate ? 'N/A' : ''}
                            </div>
                          </div>
                          <div className="w-1/2 p-2">
                            <div className="invoice-small">Mode/Terms of Payment</div>
                            <div className="font-bold">{invoice.modeOfPayment || invoice.paymentType || '\u00A0'}</div>
                          </div>
                        </div>

                        <div className="flex border-b border-black">
                          <div className="w-1/2 p-2 border-r border-black">
                            <div className="invoice-small">Dispatched through</div>
                            <div className="font-bold">{invoice.dispatchedThrough || '\u00A0'}</div>
                          </div>
                          <div className="w-1/2 p-2">
                            <div className="invoice-small">Other References</div>
                            <div className="font-bold">{invoice.otherReference || '\u00A0'}</div>
                          </div>
                        </div>

                        <div className="flex border-b border-black">
                          <div className="p-2">
                            <div className="invoice-small">Destination</div>
                            <div className="font-bold">{invoice.destination || '\u00A0'}</div>
                          </div>
                        </div>

                        <div className="flex">
                          <div className="p-2 pb-8">
                            <div className="invoice-small">Terms of Delivery</div>
                            <div className="font-bold">{invoice.termsForDelivery || '\u00A0'}</div>
                          </div>
                        </div>

                        {/* Filler to match the height of the left column */}
                        <div className="flex-grow"></div>
                      </div>
                    </div>

                    {/* Items Table Header */}
                    <div className="flex text-center font-bold border-b border-black invoice-small">
                      <div className="w-[4%] border-r border-black p-1 flex items-end justify-center">Sl No.</div>
                      <div className="w-[40%] border-r border-black p-1 flex items-end justify-center">Description of Goods</div>
                      <div className="w-[14%] border-r border-black p-1 flex items-end justify-center">Quantity</div>
                      <div className="w-[9%] border-r border-black p-1 flex items-end justify-center">Rate</div>
                      <div className="w-[6%] border-r border-black p-1 flex items-end justify-center">per</div>
                      <div className="w-[18%] p-1 flex items-end justify-center">Amount</div>
                    </div>

                    {/* Items Table Body */}
                    <div className="flex-grow flex flex-col">
                      {/* Render all line items from invoices */}
                      {invoices.length > 0 && invoices[0].lineItems && invoices[0].lineItems.length > 0 ? (
                        invoices[0].lineItems.map((item, index) => {
                          const baseAmount = (parseFloat(item.priceWithoutGST || item.invoiceValueWithoutGST) || 0) * (parseFloat(item.quantity) || 0);
                          // Use item-level GST percentage, split equally between CGST and SGST
                          const itemGstPercent = parseFloat(item.gstPercentage) || 0;
                          const cgstPercent = parseFloat(invoices[0].cgst) || (itemGstPercent / 2);
                          const sgstPercent = parseFloat(invoices[0].sgst) || (itemGstPercent / 2);
                          const cgstAmount = (baseAmount * cgstPercent) / 100;
                          const sgstAmount = (baseAmount * sgstPercent) / 100;
                          const totalWithGST = baseAmount + cgstAmount + sgstAmount;

                          return (
                            <div key={index} className="flex invoice-small">
                              <div className="w-[4%] border-r border-black p-1 text-center">{index + 1}</div>
                              <div className="w-[40%] border-r border-black p-1">
                                <span className="font-bold">{item.partName || 'Item'}</span>
                              </div>
                              <div className="w-[14%] border-r border-black p-1 text-center">{item.quantity} {item.unit}</div>
                              <div className="w-[9%] border-r border-black p-1 text-right">{(parseFloat(item.priceWithoutGST || item.invoiceValueWithoutGST) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              <div className="w-[6%] border-r border-black p-1 text-center">{item.unit}</div>
                              <div className="w-[18%] p-1 text-right font-bold">{totalWithGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                          );
                        })
                      ) : invoices.length > 0 ? (
                        invoices.map((inv, index) => (
                          <div key={index} className="flex invoice-small">
                            <div className="w-[4%] border-r border-black p-1 text-center">{index + 1}</div>
                            <div className="w-[40%] border-r border-black p-1">
                              <span className="font-bold">{projectName || 'Interior Works'}</span>
                            </div>
                            <div className="w-[14%] border-r border-black p-1 text-center"></div>
                            <div className="w-[9%] border-r border-black p-1 text-right"></div>
                            <div className="w-[6%] border-r border-black p-1 text-center"></div>
                            <div className="w-[18%] p-1 text-right font-bold">{(parseFloat(inv.invoiceValueWithoutGST || inv.totalValue || inv.invoiceValue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                        ))
                      ) : (
                        <div className="flex invoice-small">
                          <div className="w-[4%] border-r border-black p-1 text-center">1</div>
                          <div className="w-[40%] border-r border-black p-1">
                            <span className="font-bold">{projectName || 'Interior Works'}</span>
                            <div className="italic invoice-xsmall mt-1">As Per Attached Annexure</div>
                          </div>
                          <div className="w-[14%] border-r border-black p-1 text-center"></div>
                          <div className="w-[9%] border-r border-black p-1 text-right"></div>
                          <div className="w-[6%] border-r border-black p-1 text-center"></div>
                          <div className="w-[18%] p-1 text-right font-bold">0.00</div>
                        </div>
                      )}

                      {/* Tax Rows (CGST/SGST) - Only show if values are entered */}
                      {(invoice.cgst || invoice.sgst) && (
                        <div className="flex invoice-small">
                          <div className="w-[4%] border-r border-black p-1 text-center"></div>
                          <div className="w-[40%] border-r border-black p-1 text-right italic">
                            <div>Input CGST</div>
                            <div>Input SGST</div>
                          </div>
                          <div className="w-[14%] border-r border-black p-1 text-center"></div>
                          <div className="w-[9%] border-r border-black p-1 text-center flex flex-col items-center">
                            <div>{invoice.cgst || ''}</div>
                            <div>{invoice.sgst || ''}</div>
                          </div>
                          <div className="w-[6%] border-r border-black p-1 text-center flex flex-col items-center">
                            <div>%</div>
                            <div>%</div>
                          </div>
                          <div className="w-[18%] p-1 text-right">
                            <div>{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div>{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                      )}

                      {/* Round Off - Only show if roundOff has a value */}
                      {roundOff !== 0 && (
                        <div className="flex invoice-small border-b border-black">
                          <div className="w-[4%] border-r border-black p-1 text-center"></div>
                          <div className="w-[40%] border-r border-black p-1 text-right">
                            {roundOff >= 0 ? 'Add : ' : 'Less : '}<span className="font-bold">Round OFF</span>
                          </div>
                          <div className="w-[14%] border-r border-black p-1 text-center"></div>
                          <div className="w-[9%] border-r border-black p-1 text-right"></div>
                          <div className="w-[6%] border-r border-black p-1 text-center"></div>
                          <div className="w-[18%] p-1 text-right">{roundOff >= 0 ? '' : '(-)'}{Math.abs(roundOff).toFixed(2)}</div>
                        </div>
                      )}

                      {/* Vertical Spacer for empty rows and column lines */}
                      <div className="flex-grow flex relative">
                        <div className="w-[4%] border-r border-black h-full"></div>
                        <div className="w-[40%] border-r border-black h-full"></div>
                        <div className="w-[14%] border-r border-black h-full"></div>
                        <div className="w-[9%] border-r border-black h-full"></div>
                        <div className="w-[6%] border-r border-black h-full"></div>
                        <div className="w-[18%] h-full"></div>
                      </div>
                    </div>

                    {/* Total Row */}
                    <div className="flex border-t border-b border-black">
                      <div className="w-[4%] border-r border-black p-1 text-center invoice-small"></div>
                      <div className="w-[40%] border-r border-black p-1 text-right invoice-small font-bold">Total</div>
                      <div className="w-[14%] border-r border-black p-1 text-center font-bold invoice-small">{totalQuantity > 0 ? totalQuantity : ''}</div>
                      <div className="w-[9%] border-r border-black p-1 text-center"></div>
                      <div className="w-[6%] border-r border-black p-1 text-center"></div>
                      <div className="w-[18%] p-1 flex flex-col items-end justify-center">
                        <span className="font-bold text-sm">₹ {totalWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Amount in Words & Bank Details & Signature Section */}
                    <div className="flex border-b border-black min-h-[100px]">
                      {/* Left: Amount in Words */}
                      <div className="w-1/2 border-r border-black p-2 invoice-small flex flex-col">
                        <div>Amount Chargeable (in words)</div>
                        <div className="font-bold mt-1">{amountInWords}</div>
                      </div>

                      {/* Right Section: Bank Details and Signature */}
                      <div className="w-1/2 flex flex-col">


                        {/* Signature */}
                        <div className="p-2 flex justify-between items-end invoice-small">
                          <div className="text-right w-full">
                            <div className="mb-8 italic invoice-xsmall">For {companyName}</div>
                            <div className="invoice-xxsmall text-gray-500 italic">Authorised Signatory</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Text */}
                  <div className="text-center invoice-xxsmall mt-1 absolute bottom-1 right-0 left-0">
                    This is a Computer Generated Document
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Purchase;