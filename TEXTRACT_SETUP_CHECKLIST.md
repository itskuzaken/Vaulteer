# AWS Textract OCR Integration - Setup Checklist

## ✅ Completed Implementation

All code has been created and integrated:

### Backend (100% Complete)
- ✅ Form template metadata (`backend/assets/form-templates/hts/template-metadata.json`)
- ✅ AWS Textract configuration (`backend/config/aws.js`)
- ✅ Server-side image decryption (`backend/utils/imageDecryption.js`)
- ✅ Textract service with DOH form extractors (`backend/services/textractService.js`)
- ✅ Database migration SQL (`backend/migrations/20251202_add_textract_fields.sql`)
- ✅ Bull queue setup (`backend/jobs/textractQueue.js`)
- ✅ Repository updated to parse OCR data (`backend/repositories/htsFormsRepository.js`)
- ✅ Controller enqueues OCR jobs (`backend/controllers/htsFormsController.js`)
- ✅ Server initializes Textract queue (`backend/server.js`)

### Frontend (100% Complete)
- ✅ AdminFormReview OCR analysis section with:
  - Confidence scores (color-coded)
  - Test result mismatch warnings
  - Extracted fields grid
  - Confidence breakdown
  - Collapsible raw text display
  - OCR status display with timestamps
- ✅ OCR status badges in submission cards
- ✅ Mismatch detection badges

---

## 🔧 Required Setup Tasks

### 1. Install NPM Packages
```bash
cd backend
npm install @aws-sdk/client-textract bull
```

**Packages:**
- `@aws-sdk/client-textract` - AWS Textract SDK for Node.js
- `bull` - Redis-based queue for background job processing

---

### 2. Install and Start Redis

**Option A: Docker (Recommended)**
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

**Option B: Windows Native**
1. Download from: https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`

**Option C: Production (AWS ElastiCache)**
- Create Redis cluster in AWS ElastiCache
- Update `REDIS_HOST` in `.env` with cluster endpoint

**Verify Redis is running:**
```bash
redis-cli ping
# Expected: PONG
```

---

### 3. Set Up AWS IAM User

**Steps:**
1. Go to AWS IAM Console: https://console.aws.amazon.com/iam/
2. Create new user: `vaulteer-textract-service`
3. Create inline policy with permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "textract:DetectDocumentText",
           "textract:AnalyzeDocument"
         ],
         "Resource": "*"
       }
     ]
   }
   ```
4. Create access key → Save credentials

**Cost Estimate:**
- AnalyzeDocument with FORMS: ~$0.05 per page
- Expected cost per HTS form: ~$0.10 (2 pages)

---

### 4. Configure Environment Variables

Add to `backend/.env`:

```env
# AWS Textract Configuration
AWS_ACCESS_KEY_ID=AKIA_YOUR_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_REGION=ap-southeast-1

# Redis Configuration (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional: Redis password if using AWS ElastiCache
# REDIS_PASSWORD=your_redis_password
```

**Security Note:** Never commit `.env` file to Git!

---

### 5. Run Database Migration

**Execute on AWS RDS:**
```bash
mysql -h your-rds-endpoint.rds.amazonaws.com -u admin -p vaulteer_db < backend/migrations/20251202_add_textract_fields.sql
```

**Or use migration script:**
```bash
cd backend
node migrate.js
```

**Adds columns to `hts_forms` table:**
- `extracted_data` (JSON) - Parsed OCR results
- `extraction_confidence` (DECIMAL) - 0-100 score
- `extracted_at` (TIMESTAMP) - Processing completion time
- `ocr_status` (ENUM) - pending/processing/completed/failed
- Index on `ocr_status` for filtering

**Verify migration:**
```sql
DESCRIBE hts_forms;
-- Should see the 4 new columns
```

---

### 6. Test Locally

**Start the backend:**
```bash
cd backend
npm start
```

**Check logs for:**
```
✓ Connected to AWS RDS
✓ Textract OCR queue initialized
Server running on port 3000
```

**Submit a test form:**
1. Start frontend: `cd frontend && npm run dev`
2. Login as admin
3. Submit a filled HTS form
4. Check console logs for: `OCR job queued for form {formId}`
5. Wait 10-30 seconds for processing
6. View submission → Should see OCR Analysis section

---

## 🧪 Testing Scenarios

### Test Case 1: Clear Printed Form
- **Objective:** Validate high-confidence extraction
- **Steps:**
  1. Submit DOH HTS Form 2021 with clear printed text
  2. Wait for OCR processing (check admin panel)
  3. View submission details
- **Expected:**
  - Overall confidence: >95%
  - Test result extracted correctly
  - All priority 1-2 fields populated
  - No mismatch warnings

### Test Case 2: Handwritten Form
- **Objective:** Test low-confidence handling
- **Steps:**
  1. Submit form with handwritten sections
  2. Check OCR analysis
- **Expected:**
  - Lower confidence scores (70-85%)
  - Some fields may not be detected
  - System should still function

### Test Case 3: Test Result Mismatch
- **Objective:** Validate mismatch detection
- **Steps:**
  1. Submit form where user selects "Non-Reactive"
  2. But actual form has "Reactive" checked
  3. View submission
- **Expected:**
  - Red warning banner: "Test Result Mismatch Detected"
  - Shows both values (user vs OCR)
  - Manual review prompt

### Test Case 4: OCR Failures
- **Objective:** Test error handling
- **Steps:**
  1. Submit corrupted or extremely low-quality image
  2. Check OCR status
- **Expected:**
  - `ocr_status` = 'failed'
  - Error message displayed
  - Manual review required
  - Original submission data intact

### Test Case 5: Queue Resilience
- **Objective:** Test retry logic
- **Steps:**
  1. Stop Redis server
  2. Submit form → OCR job will fail to enqueue
  3. Submission should still succeed
  4. Restart Redis
  5. Check Bull dashboard for failed jobs
- **Expected:**
  - Form submission succeeds even if queue fails
  - Job retries 3 times with exponential backoff

---

## 📊 Monitoring

### Check Queue Status
```bash
# Redis CLI
redis-cli
> KEYS bull:textract-ocr:*
> LLEN bull:textract-ocr:wait
> LLEN bull:textract-ocr:active
> LLEN bull:textract-ocr:failed
```

### Check Database OCR Status
```sql
-- Count by OCR status
SELECT ocr_status, COUNT(*) 
FROM hts_forms 
GROUP BY ocr_status;

-- Find failed OCR jobs
SELECT form_id, control_number, created_at 
FROM hts_forms 
WHERE ocr_status = 'failed';

-- Average confidence score
SELECT AVG(extraction_confidence) as avg_confidence
FROM hts_forms
WHERE ocr_status = 'completed';
```

### View Queue Logs
```bash
# Backend logs show OCR processing
cd backend
pm2 logs # If using PM2

# Or check console output
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist
- [ ] AWS credentials configured in production `.env`
- [ ] Redis/ElastiCache endpoint updated
- [ ] Database migration executed on production RDS
- [ ] HTTPS enabled (required for camera API)
- [ ] NPM packages installed on production server
- [ ] Test with actual filled forms from LoveYourself Inc.

### Performance Targets
- OCR processing time: <30 seconds per form
- Queue throughput: 50+ forms/minute
- Confidence threshold: >90% for priority 1-2 fields
- Cost per form: <$0.15

### Scaling Considerations
- **High Volume:** Increase Bull queue concurrency in `textractQueue.js`
- **Faster Processing:** Add more worker processes (PM2 cluster mode)
- **Cost Optimization:** Consider AWS Textract async API for batch processing
- **Storage:** Monitor database size, migrate to S3 if exceeds 50GB

---

## 🔒 Security Notes

### Data Protection
- Images remain encrypted in database (AES-GCM)
- Decryption only happens server-side for OCR processing
- AWS Textract receives decrypted images temporarily
- Extracted data stored in database, not in AWS

### AWS IAM Best Practices
- Use least-privilege policy (only Textract permissions)
- Rotate access keys every 90 days
- Enable CloudTrail logging for API calls
- Set up billing alerts for Textract usage

### Redis Security
- Use password authentication in production (`REDIS_PASSWORD`)
- Enable TLS for Redis connections
- Restrict network access (VPC security groups)

---

## 📚 Form Template Information

**Template:** DOH Personal Information Sheet (HTS Form 2021)  
**Organization:** LoveYourself Inc. (Bagan!) - Bacolod City facility  
**Location:** `backend/assets/form-templates/hts/`

### Extraction Priorities

**Priority 1 (Essential):**
- Test Result (Question 19): Reactive/Non-reactive/Indeterminate

**Priority 2 (Identity):**
- Test Date (DD/MM/YYYY)
- Full Name (First/Middle/Last)
- Birth Date

**Priority 3 (Validation):**
- PhilHealth Number (12 digits)
- Testing Facility (LoveYourself Inc.)
- Control Number (HTS-{timestamp}-{random})

**Priority 4 (Statistical):**
- Sex/Gender Identity
- Age
- Previous HIV Test
- Risk Factors

---

## 🐛 Troubleshooting

### OCR jobs not processing
**Check:**
1. Redis is running: `redis-cli ping`
2. Bull queue initialized: Check server logs for "Textract OCR queue initialized"
3. AWS credentials valid: `aws sts get-caller-identity` (if AWS CLI installed)

### Low confidence scores
**Causes:**
- Poor image quality (lighting, focus, resolution)
- Handwritten text (Textract optimized for printed text)
- Form variations (different layout from template)

**Solutions:**
- Improve camera capture UI (add flash toggle, focus indicator)
- Add image quality validation before submission
- Consider manual review threshold (e.g., <80% confidence)

### Mismatch warnings too frequent
**Investigate:**
- Compare actual form images with user selections
- Check if users are misunderstanding form questions
- Validate extraction patterns in `textractService.js`
- Add user training/instructions

### Database size growing rapidly
**Solutions:**
- Implement image compression before storage
- Migrate older submissions to S3
- Set retention policy (e.g., delete after 2 years)
- Consider using S3 from the start for new submissions

---

## 📞 Support Resources

### AWS Documentation
- Textract API: https://docs.aws.amazon.com/textract/
- IAM Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html

### Bull Queue
- Documentation: https://github.com/OptimalBits/bull
- Redis setup: https://redis.io/docs/getting-started/

### Next Steps After Setup
1. Test with 10-20 filled forms
2. Analyze confidence score distribution
3. Identify common extraction errors
4. Refine extraction patterns if needed
5. Train admins on mismatch review process
6. Set up production monitoring (AWS CloudWatch, DataDog, etc.)

---

**Implementation Date:** December 2024  
**Status:** Code Complete - Setup Required  
**Estimated Setup Time:** 2-3 hours  
**Documentation:** See updated README.md for user guide
