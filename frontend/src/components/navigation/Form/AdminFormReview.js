"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import Image from "next/image";
import { IoSearchOutline, IoPersonOutline, IoCalendarOutline, IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";
import Button from "../../ui/Button";
import { decryptFormImages } from "../../../utils/imageEncryption";
import { API_BASE } from "../../../config/config";

export default function AdminFormReview() {
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [decryptedImages, setDecryptedImages] = useState({}); // Cache for decrypted images
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchAllSubmissions();
  }, []);

  const filterSubmissions = useCallback(() => {
    let filtered = submissions;

    if (statusFilter !== "all") {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (sub) =>
          sub.control_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.submitter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSubmissions(filtered);
  }, [submissions, statusFilter, searchTerm]);

  useEffect(() => {
    filterSubmissions();
  }, [filterSubmissions]);

  const fetchAllSubmissions = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(
        `${API_BASE}/hts-forms/all`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Decrypt images when viewing a submission
  const decryptSubmissionImages = async (submission) => {
    // Check if already decrypted
    if (decryptedImages[submission.form_id]) {
      return decryptedImages[submission.form_id];
    }

    // If no encryption key, return original images (backwards compatibility)
    if (!submission.encryption_key) {
      return {
        frontImage: submission.front_image_url,
        backImage: submission.back_image_url
      };
    }

    try {
      // Decrypt the images
      const decrypted = await decryptFormImages(
        submission.front_image_url,
        submission.front_image_iv,
        submission.back_image_url,
        submission.back_image_iv,
        submission.encryption_key
      );

      // Cache the decrypted images
      setDecryptedImages(prev => ({
        ...prev,
        [submission.form_id]: decrypted
      }));

      return decrypted;
    } catch (error) {
      console.error("Error decrypting images:", error);
      alert("Failed to decrypt images. The data may be corrupted.");
      return null;
    }
  };

  // Check for test result mismatch
  const checkTestResultMismatch = (submission) => {
    if (!submission.extracted_data || !submission.extracted_data.testResult) {
      return false;
    }
    
    return submission.test_result !== submission.extracted_data.testResult;
  };

  // Handle opening submission modal with decryption
  const handleViewSubmission = async (submission) => {
    const images = await decryptSubmissionImages(submission);
    if (images) {
      setSelectedSubmission({
        ...submission,
        decryptedFrontImage: images.frontImage,
        decryptedBackImage: images.backImage
      });
      setExtractedData(submission.extracted_data);
    }
  };

  const handleStatusUpdate = async (formId, newStatus, adminNotes = "") => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(
        `${API_BASE}/hts-forms/${formId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`
          },
          body: JSON.stringify({
            status: newStatus,
            adminNotes,
            reviewedBy: user.uid
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchAllSubmissions();
        setSelectedSubmission(null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-red" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by control number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-red focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-red focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Submissions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSubmissions.map((submission) => (
          <div
            key={submission.form_id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleViewSubmission(submission)}
          >
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg relative overflow-hidden">
                <Image
                  src={submission.front_image_url}
                  alt={`${submission.control_number} - Front`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">Front</div>
              </div>
              <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg relative overflow-hidden">
                <Image
                  src={submission.back_image_url}
                  alt={`${submission.control_number} - Back`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">Back</div>
              </div>
            </div>
            <h3 className="font-mono font-semibold text-sm text-gray-900 dark:text-white mb-2">
              {submission.control_number}
            </h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <IoPersonOutline className="w-4 h-4" />
                {submission.submitter_name}
              </div>
              <div className="flex items-center gap-2">
                <IoCalendarOutline className="w-4 h-4" />
                {formatDate(submission.created_at)}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  submission.status === "approved"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : submission.status === "rejected"
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
              >
                {submission.status}
              </span>
              
              {/* OCR Status Badge */}
              {submission.ocr_status === 'completed' && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                  📄 OCR Complete
                </span>
              )}
              {submission.ocr_status === 'processing' && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  🔄 Processing
                </span>
              )}
              {submission.ocr_status === 'failed' && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  ❌ OCR Failed
                </span>
              )}
              
              {/* Test Result Mismatch Badge */}
              {submission.ocr_status === 'completed' && checkTestResultMismatch(submission) && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  ⚠️ Mismatch
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredSubmissions.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">No submissions found.</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Form Details
              </h2>

              {/* Images Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Front Side {selectedSubmission.encryption_key && <span className="text-xs text-green-600 dark:text-green-400">🔒 Encrypted</span>}
                  </h3>
                  <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg relative overflow-hidden">
                    <Image
                      src={selectedSubmission.decryptedFrontImage || selectedSubmission.front_image_url}
                      alt={`${selectedSubmission.control_number} - Front`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Back Side {selectedSubmission.encryption_key && <span className="text-xs text-green-600 dark:text-green-400">🔒 Encrypted</span>}
                  </h3>
                  <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg relative overflow-hidden">
                    <Image
                      src={selectedSubmission.decryptedBackImage || selectedSubmission.back_image_url}
                      alt={`${selectedSubmission.control_number} - Back`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Control Number</label>
                    <p className="font-mono font-semibold text-gray-900 dark:text-white">
                      {selectedSubmission.control_number}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Submitter</label>
                    <p className="text-gray-900 dark:text-white">{selectedSubmission.submitter_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Username</label>
                    <p className="text-gray-900 dark:text-white">{selectedSubmission.username}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
                    <p className="text-gray-900 dark:text-white">{selectedSubmission.email}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Test Result</label>
                    <p className={`font-semibold ${
                      selectedSubmission.test_result === 'reactive' 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {selectedSubmission.test_result === 'reactive' ? '⚠️ Reactive' : '✓ Non-Reactive'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Submitted</label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(selectedSubmission.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                    <p className="text-gray-900 dark:text-white capitalize">{selectedSubmission.status}</p>
                  </div>
                </div>
              </div>

              {/* OCR Analysis Section */}
              {extractedData && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📄 OCR Analysis</h3>
                  
                  {/* Confidence Score */}
                  <div className="mb-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Overall Confidence: </span>
                    <span className={`font-bold text-lg ${
                      selectedSubmission.extraction_confidence >= 95 ? 'text-green-600' :
                      selectedSubmission.extraction_confidence >= 80 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {selectedSubmission.extraction_confidence}%
                    </span>
                  </div>
                  
                  {/* Test Result Mismatch Warning */}
                  {checkTestResultMismatch(selectedSubmission) && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3 text-red-700 dark:text-red-400">
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1">
                          <p className="font-semibold text-base">Test Result Mismatch Detected</p>
                          <p className="text-sm mt-1">
                            User submitted: <strong className="font-bold">{selectedSubmission.test_result}</strong><br/>
                            OCR extracted: <strong className="font-bold">{extractedData.testResult}</strong>
                          </p>
                          <p className="text-sm mt-2 italic">Please review manually and verify the correct result.</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Extracted Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Control Number (OCR)</span>
                      <p className="font-medium text-gray-900 dark:text-white mt-1">
                        {extractedData.controlNumber || 'Not detected'}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Test Result (OCR)</span>
                      <p className={`font-medium mt-1 ${
                        extractedData.testResult === 'reactive' ? 'text-red-600' : 
                        extractedData.testResult === 'non-reactive' ? 'text-green-600' :
                        'text-gray-900 dark:text-white'
                      }`}>
                        {extractedData.testResult === 'reactive' ? '⚠️ Reactive' : 
                         extractedData.testResult === 'non-reactive' ? '✓ Non-Reactive' :
                         extractedData.testResult || 'Not detected'}
                      </p>
                    </div>
                    {extractedData.fullName && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Full Name (OCR)</span>
                        <p className="font-medium text-gray-900 dark:text-white mt-1">{extractedData.fullName}</p>
                      </div>
                    )}
                    {extractedData.testingFacility && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Testing Facility</span>
                        <p className="font-medium text-gray-900 dark:text-white mt-1">{extractedData.testingFacility}</p>
                      </div>
                    )}
                    {extractedData.testDate && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Test Date (OCR)</span>
                        <p className="font-medium text-gray-900 dark:text-white mt-1">{extractedData.testDate.raw}</p>
                      </div>
                    )}
                    {extractedData.philHealthNumber && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">PhilHealth Number</span>
                        <p className="font-medium text-gray-900 dark:text-white mt-1">{extractedData.philHealthNumber}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Confidence Breakdown */}
                  <div className="mb-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confidence Breakdown:</p>
                    <div className="flex gap-6">
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Front Image: </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {extractedData.frontConfidence?.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Back Image: </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {extractedData.backConfidence?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Raw Text (Collapsible) */}
                  <details className="mb-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <summary className="cursor-pointer font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-3">
                      View Raw Extracted Text
                    </summary>
                    <div className="px-3 pb-3 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Front Image Text:</p>
                        <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-40 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {extractedData.frontText || 'No text extracted'}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Back Image Text:</p>
                        <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-40 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {extractedData.backText || 'No text extracted'}
                        </pre>
                      </div>
                    </div>
                  </details>
                  
                  {/* OCR Status */}
                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <span>OCR Status: </span>
                    <span className={`font-medium ${
                      selectedSubmission.ocr_status === 'completed' ? 'text-green-600' :
                      selectedSubmission.ocr_status === 'processing' ? 'text-yellow-600' :
                      selectedSubmission.ocr_status === 'failed' ? 'text-red-600' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {selectedSubmission.ocr_status}
                    </span>
                    {selectedSubmission.extracted_at && (
                      <span className="ml-2 text-gray-500 dark:text-gray-500">
                        (Extracted: {new Date(selectedSubmission.extracted_at).toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Show message if OCR not completed */}
              {selectedSubmission?.ocr_status === 'pending' && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-blue-700 dark:text-blue-400 text-sm flex items-center gap-2">
                      <span className="text-lg">⏳</span>
                      <span>OCR analysis is pending. Results will appear here once processing is complete.</span>
                    </p>
                  </div>
                </div>
              )}

              {selectedSubmission?.ocr_status === 'processing' && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-yellow-700 dark:text-yellow-400 text-sm flex items-center gap-2">
                      <span className="text-lg animate-spin">🔄</span>
                      <span>OCR analysis is currently processing. Please refresh in a moment.</span>
                    </p>
                  </div>
                </div>
              )}

              {selectedSubmission?.ocr_status === 'failed' && (
                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                      <span className="text-lg">❌</span>
                      <span>OCR analysis failed. Manual review required.</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={() => setSelectedSubmission(null)} variant="secondary">
                  Close
                </Button>
                {selectedSubmission.status === "pending" && (
                  <>
                    <Button
                      onClick={() => handleStatusUpdate(selectedSubmission.form_id, "rejected")}
                      variant="danger"
                      className="gap-2"
                    >
                      <IoCloseCircle className="w-5 h-5" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate(selectedSubmission.form_id, "approved")}
                      variant="primary"
                      className="gap-2"
                    >
                      <IoCheckmarkCircle className="w-5 h-5" />
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
