import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, X, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Undo, Redo, Type, Paperclip } from 'lucide-react';
import { message, Spin } from 'antd';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email) => emailRegex.test(email?.trim());

function EmailMultiInput({ label, values, onChange }) {
  const [input, setInput] = useState("");

  const addEmail = (email) => {
    const cleaned = email.trim();

    if (cleaned && emailRegex.test(cleaned) && !values.includes(cleaned)) {
      onChange([...values, cleaned]);
    }
  };

  const handleKeyDown = (e) => {
    if (["Enter", ",", " "].includes(e.key)) {
      e.preventDefault();
      addEmail(input);
      setInput("");
    }
  };

  const handleBlur = () => {
    addEmail(input);
    setInput("");
  };

  const removeEmail = (index) => {
    const updated = values.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="flex items-start border-b border-gray-200 pb-3">
      <div className="flex-1 flex flex-wrap gap-2 px-3 py-2">
        {values.map((email, idx) => (
          <span
            key={idx}
            className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full shadow text-sm"
          >
            {email}
            <button
              onClick={() => removeEmail(idx)}
              className="text-gray-600 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </span>
        ))}

        <input
          className="flex-grow min-w-[150px] focus:outline-none py-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="add email..."
        />
      </div>
    </div>
  );
}

const emailTemplate = ({ title, reportType, data }) => {
  return (`
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; padding: 0; margin: 0;">
  
  <p style="margin: 0 0 20px 0;">
    Hi,
  </p>

  <p style="margin: 0 0 20px 0; line-height: 1.6;">
    Please find the attached modular kitchen design report.
  </p>

  <p style="margin: 0 0 5px 0;">
    Thanks,
  </p>

  <p style="margin: 0;">
    Voomet Team
  </p>

</div>
  `)
};

const EmailCompose = ({ emailAddress, onSend, closeModel, modelTitle, handlePreview, tomail = [], emailapiTrigger, emailMeta }) => {
  const { title, reportType, data, defaultSubject } = emailMeta;
  const [previewLoading, setPreviewLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showCC, setShowCC] = useState(false);
  const [showBCC, setShowBCC] = useState(false);
  const [emailData, setEmailData] = useState({
    from: 'user@example.com',
    to: [...tomail],
    cc: [],
    bcc: [],
    subject: defaultSubject,
    body: ``
  });
  const [showFontSize, setShowFontSize] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);
  const editorRef = useRef(null);
  const modalRef = useRef(null);
  const alreadyAttached = useRef(false);

  useEffect(() => {
    setEmailData(prev => ({ ...prev, from: emailAddress }));
  }, [emailAddress])

  useEffect(() => {
    if (!alreadyAttached.current) {
      handlePreview(handlePdfAttach, setPreviewLoading);
      alreadyAttached.current = true;
    }

    if (editorRef.current) {
      editorRef.current.innerHTML = emailTemplate({ title, reportType, data });
    }

    setEmailData(prev => ({
      ...prev,
      subject: defaultSubject
    }));
  }, []);




  const handleChange = (field, value) => {
    setEmailData(prev => ({ ...prev, [field]: value }));
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handlePdfAttach = (pdfFileObj) => {
    setAttachments(prev => [...prev, pdfFileObj]);
  };

  const handleSend = () => {
    const bodyContent = editorRef.current?.innerHTML || '';
    const finalEmailData = { ...emailData, body: bodyContent, attachments: attachments.map(a => a.file) };

    const normalize = (val) => {
      if (Array.isArray(val)) return val;
      if (!val || !val.trim()) return [];
      return val
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);
    };

    finalEmailData.to = normalize(finalEmailData.to);
    finalEmailData.cc = normalize(finalEmailData.cc);
    finalEmailData.bcc = normalize(finalEmailData.bcc);

    if (finalEmailData.to.length === 0) {
      message.error("At least one 'To' email address is required");
      return;
    }

    // Check for empty required fields
    if (!finalEmailData.subject || !finalEmailData.body) {
      message.error('Error: Please fill in all required fields (To and Body)');
      return;
    }

    // Check if body has actual content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = finalEmailData.body;
    const bodyText = tempDiv.textContent || tempDiv.innerText || '';

    if (!bodyText.trim()) {
      message.error('Error: Email body cannot be empty');
      return;
    }

    const fieldsToValidate = [
      { key: "to", label: "To" },
      { key: "cc", label: "CC" },
      { key: "bcc", label: "BCC" }
    ];

    for (const { key, label } of fieldsToValidate) {
      const arr = finalEmailData[key];

      if (Array.isArray(arr) && arr.length > 0) {
        for (const email of arr) {
          if (!isValidEmail(email)) {
            message.error(`Invalid email address in ${label}: ${email}`);
            return;
          }
        }
      }
    }

    // If all validations pass, send the email
    if (onSend) {
      onSend(finalEmailData);
    } else {
      console.log('Sending email:', finalEmailData);
      message.success('Email sent successfully! (Check console for data)');
    }
  };



  const fontSizes = [
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Large', value: '5' },
    { label: 'Huge', value: '7' }
  ];

  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF',
    '#F3F3F3', '#FFFFFF', '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF',
    '#4A86E8', '#0000FF', '#9900FF', '#FF00FF'
  ];

  const onClose = () => {
    closeModel()
  }

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      closeModel();
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
      const fileObj = {
        file,
        url: URL.createObjectURL(file),
        name: file.name
      };
      handlePdfAttach(fileObj);
    });

    e.target.value = "";
  };

  const generatedPdfExists = useMemo(() => {
    return attachments.some(att => att.file?.type === "application/pdf");
  }, [attachments]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black backdrop-blur-sm ${emailapiTrigger.status === "pending" ? "bg-opacity-50 pointer-events-none" : "bg-opacity-50"}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl"
      >
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{modelTitle}</h2>
            <button className="hover:bg-blue-700 p-2 rounded" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Email Form */}
          <div className="p-6 space-y-4">
            {/* From Field (Disabled) */}
            <div className="flex items-center border-b border-gray-200 pb-3">
              <label className="w-20 text-gray-600 font-medium">From:</label>
              <input
                type="email"
                value={emailData.from}
                disabled
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-500 rounded cursor-not-allowed"
              />
            </div>

            {/* To Field */}
            <div className="flex items-center border-b border-gray-200 pb-3">
              <label className="w-20 text-gray-600 font-medium">To:</label>
              <EmailMultiInput
                label="To:"
                values={emailData.to}
                onChange={(updated) =>
                  setEmailData(prev => ({ ...prev, to: updated }))
                }
              />
              {/* <input
                type="email"
                value={emailData.to}
                onChange={(e) => handleChange('to', e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 px-3 py-2 focus:outline-none"
              /> */}
              <div className="flex gap-2 ml-2">
                {!showCC && (
                  <button
                    onClick={() => setShowCC(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Cc
                  </button>
                )}
                {!showBCC && (
                  <button
                    onClick={() => setShowBCC(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* CC Field */}
            {showCC && (
              <div className="flex items-center border-b border-gray-200 pb-3">
                <label className="w-20 text-gray-600 font-medium">Cc:</label>
                {/* <input
                  type="email"
                  value={emailData.cc}
                  onChange={(e) => handleChange('cc', e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 px-3 py-2 focus:outline-none"
                /> */}

                {showCC && (
                  <EmailMultiInput
                    label="Cc:"
                    values={emailData.cc}
                    onChange={(updated) =>
                      setEmailData(prev => ({ ...prev, cc: updated }))
                    }
                  />
                )}
                <button
                  onClick={() => { setShowCC(false), setEmailData(prev => ({ ...prev, 'cc': [] })) }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* BCC Field */}
            {showBCC && (
              <div className="flex items-center border-b border-gray-200 pb-3">
                <label className="w-20 text-gray-600 font-medium">Bcc:</label>
                {/* <input
                  type="email"
                  value={emailData.bcc}
                  onChange={(e) => handleChange('bcc', e.target.value)}
                  placeholder="bcc@example.com"
                  className="flex-1 px-3 py-2 focus:outline-none"
                /> */}
                {showBCC && (
                  <EmailMultiInput
                    label="Bcc:"
                    values={emailData.bcc}
                    onChange={(updated) =>
                      setEmailData(prev => ({ ...prev, bcc: updated }))
                    }
                  />
                )}
                <button
                  onClick={() => { setShowBCC(false), setEmailData(prev => ({ ...prev, 'bcc': [] })) }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Subject Field */}
            <div className="flex items-center border-b border-gray-200 pb-3">
              <label className="w-20 text-gray-600 font-medium">Subject:</label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                placeholder="Email subject"
                className="flex-1 px-3 py-2 focus:outline-none"
              />
            </div>

            {/* Rich Text Editor Toolbar */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
                {/* Undo/Redo */}
                <button
                  onClick={() => execCommand('undo')}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Undo"
                >
                  <Undo size={18} />
                </button>
                <button
                  onClick={() => execCommand('redo')}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Redo"
                >
                  <Redo size={18} />
                </button>

                <div className="w-px bg-gray-300 mx-1"></div>

                {/* Font Size */}
                <div className="relative">
                  <button
                    onClick={() => setShowFontSize(!showFontSize)}
                    className="p-2 hover:bg-gray-200 rounded flex items-center gap-1"
                    title="Font Size"
                  >
                    <Type size={18} />
                    <span className="text-xs">▼</span>
                  </button>
                  {showFontSize && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10">
                      {fontSizes.map(size => (
                        <button
                          key={size.value}
                          onClick={() => {
                            execCommand('fontSize', size.value);
                            setShowFontSize(false);
                          }}
                          className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-px bg-gray-300 mx-1"></div>

                {/* Bold, Italic, Underline */}
                <button
                  onClick={() => execCommand('bold')}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Bold"
                >
                  <Bold size={18} />
                </button>
                <button
                  onClick={() => execCommand('italic')}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Italic"
                >
                  <Italic size={18} />
                </button>
                <button
                  onClick={() => execCommand('underline')}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Underline"
                >
                  <Underline size={18} />
                </button>

                <div className="w-px bg-gray-300 mx-1"></div>

                {/* Text Color */}
                <div className="relative">
                  <button
                    onClick={() => setShowTextColor(!showTextColor)}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Text Color"
                  >
                    <span className="font-bold">A</span>
                    <span className="text-xs">▼</span>
                  </button>
                  {showTextColor && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 z-10">
                      <div className="grid grid-cols-10 gap-1">
                        {colors.map(color => (
                          <button
                            key={color}
                            onClick={() => {
                              execCommand('foreColor', color);
                              setShowTextColor(false);
                            }}
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Background Color */}
                <div className="relative">
                  <button
                    onClick={() => setShowBgColor(!showBgColor)}
                    className="p-2 hover:bg-gray-200 rounded"
                    title="Background Color"
                  >
                    <span className="font-bold bg-yellow-300 px-1">A</span>
                    <span className="text-xs">▼</span>
                  </button>
                  {showBgColor && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 z-10">
                      <div className="grid grid-cols-10 gap-1">
                        {colors.map(color => (
                          <button
                            key={color}
                            onClick={() => {
                              execCommand('backColor', color);
                              setShowBgColor(false);
                            }}
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px bg-gray-300 mx-1"></div>

                {/* Alignment */}
                <button
                  onClick={() => execCommand('justifyLeft')}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Align Left"
                >
                  <AlignLeft size={18} />
                </button>
                <button
                  onClick={() => execCommand('justifyCenter')}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Align Center"
                >
                  <AlignCenter size={18} />
                </button>
                <button
                  onClick={() => execCommand('justifyRight')}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Align Right"
                >
                  <AlignRight size={18} />
                </button>

                <div className="w-px bg-gray-300 mx-1"></div>

                {/* Lists */}
                <button
                  onClick={() => execCommand('insertUnorderedList')}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Bullet List"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => execCommand('insertOrderedList')}
                  className="p-2 hover:bg-gray-200 rounded"
                  title="Numbered List"
                >
                  <ListOrdered size={18} />
                </button>

                <div className="w-px bg-gray-300 mx-1"></div>

                {/* Indent */}
                <button
                  onClick={() => execCommand('indent')}
                  className="p-2 hover:bg-gray-200 rounded text-sm font-bold"
                  title="Indent"
                >
                  →
                </button>
                <button
                  onClick={() => execCommand('outdent')}
                  className="p-2 hover:bg-gray-200 rounded text-sm font-bold"
                  title="Outdent"
                >
                  ←
                </button>
              </div>

              {/* Editor Content */}
              <div
                ref={editorRef}
                contentEditable
                className="min-h-64 p-4 focus:outline-none"
                style={{ minHeight: '300px' }}
                suppressContentEditableWarning
              >
              </div>

              {attachments.length > 0 && (
                <div className="p-4 border-t border-gray-200 flex gap-4 flex-wrap">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg shadow">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        {att.name}
                      </a>

                      <button
                        onClick={() =>
                          setAttachments(prev => prev.filter((_, i) => i !== idx))
                        }
                        className="text-red-600 font-bold"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-flex-start gap-[1rem]">
            <button
              onClick={handleSend}
              className={`flex itemse-centr gap-2 px-6 py-2 rounded-lg transition-colors 
                  ${emailapiTrigger.status === "pending" || previewLoading? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}
                `}
            >
              {emailapiTrigger.status === "pending" ? (
                <>
                  <Spin />
                  Sending...
                </>
              ) : emailapiTrigger.status === "success" ? (
                "Sent Successfully"
              ) : emailapiTrigger.status === "error" ? (
                "Failed ― Retry?"
              ) : (
                <>
                  <Send size={18} /> Send
                </>
              )}
            </button>
            <button
              onClick={() => handlePreview(handlePdfAttach, setPreviewLoading)}
              disabled={previewLoading || generatedPdfExists}
              className={`p-2 rounded flex items-center gap-2 
                          ${previewLoading || generatedPdfExists ? "bg-gray-300 cursor-not-allowed" : "bg-gray-200"}`}
            >
              {previewLoading ? (
                <>
                  <Spin />
                  Attaching...
                </>
              ) : (
                generatedPdfExists ? "Already Attached" : "Attach Generated PDF"
              )}
            </button>
            <div className="relative">
              <input
                type="file"
                id="fileAttachmentInput"
                className="hidden"
                multiple
                onChange={handleFileUpload}
              />
              <button
                onClick={() => document.getElementById('fileAttachmentInput').click()}
                disabled={previewLoading}
                className="p-2 hover:bg-gray-200 rounded"
                title="Attach File"
              >
                <Paperclip size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailCompose;