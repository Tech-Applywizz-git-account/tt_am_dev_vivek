# Pending Client API Integration Guide

## Overview
The `api/direct-onboard.ts` endpoint now supports **two modes** of operation:
1. **Direct Onboarding** (default) - Creates auth user, syncs to Django
2. **Pending Client Submission** - Only inserts into `pending_clients` table

This consolidation saves a Vercel Serverless Function slot while maintaining all functionality.

---

## API Endpoint
**URL:** `POST /api/direct-onboard`

---

## Mode Selection

### **Mode 1: Direct Onboarding (Default)**
This is the existing behavior - creates a full client with auth user and Django sync.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "experience": "3",
  "applywizz_id": "APW-12345",
  "gender": "Male",
  "state_of_residence": "California",
  "zip_or_country": "90001",
  "resume_s3_path": "resumes/john-doe-resume.pdf",
  "start_date": "2026-03-01",
  "job_role_preferences": ["Software Engineer"],
  "visa_type": "H1B",
  "location_preferences": ["Remote"]
}
```

**Response:**
```json
{
  "message": "Client onboarded successfully",
  "applywizz_id": "APW-12345",
  "client_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "auth-user-id",
  "karmafy_user_id": 123,
  "karmafy_lead_id": 456
}
```

---

### **Mode 2: Pending Client Submission**
Stores client data in `pending_clients` table for review. No auth user creation, no Django sync.

**Request Body:**
```json
{
  "submission_type": "pending",
  "full_name": "Jane Smith",
  "email": "jane.smith@example.com",
  "phone": "+1987654321",
  "experience": "5",
  "applywizz_id": "APW-67890",
  "gender": "Female",
  "state_of_residence": "New York",
  "zip_or_country": "10001",
  "resume_s3_path": "resumes/jane-smith-resume.pdf",
  "start_date": "2026-04-01",
  "job_role_preferences": ["Data Scientist"],
  "visa_type": "Green Card",
  "location_preferences": ["Hybrid"]
}
```

**Response:**
```json
{
  "message": "Pending client submitted successfully",
  "applywizz_id": "APW-67890",
  "pending_client_id": "660e8400-e29b-41d4-a716-446655440111",
  "email": "jane.smith@example.com",
  "status": "pending_review"
}
```

---

## Required Fields (Both Modes)
- `full_name` (string)
- `email` (string, valid email format)
- `phone` (string)
- `experience` (string)
- `applywizz_id` (string)
- `gender` (string: "Male", "Female", "Other", "Prefer Not to Say")
- `state_of_residence` (string)
- `zip_or_country` (string)
- `resume_s3_path` (string)
- `start_date` (string, ISO date format)
- `job_role_preferences` (array of strings)
- `visa_type` (string: "F1", "H1B", "Green Card", "Citizen", "H4EAD", "Other")
- `location_preferences` (array of strings)

---

## Optional Fields
- `submission_type` (string: "direct" | "pending") - **KEY FIELD FOR MODE SELECTION**
- `personal_email` (string)
- `work_preferences` (string: "Remote", "Hybrid", "On-site", "All")
- `salary_range` (string)
- `work_auth_details` (string)
- `sponsorship` (boolean)
- `github_url` (string)
- `linked_in_url` (string)
- `end_date` (string, ISO date)
- `willing_to_relocate` (boolean)
- `alternate_job_roles` (string or array)
- `no_of_applications` (string, default: "20")
- `highest_education` (string)
- `university_name` (string)
- `cumulative_gpa` (string)
- `main_subject` (string)
- `graduation_year` (string)
- `badge_value` (number, default: 0)
- `is_over_18` (boolean)
- `eligible_to_work_in_us` (boolean)
- `require_future_sponsorship` (boolean)
- `can_perform_essential_functions` (boolean)
- `worked_for_company_before` (boolean)
- `discharged_for_policy_violation` (boolean)
- `referred_by_agency` (boolean)
- `desired_start_date` (string, ISO date)
- `can_work_3_days_in_office` (boolean)
- `role` (string)
- `convicted_of_felony` (boolean)
- `felony_explanation` (string)
- `pending_investigation` (boolean)
- `willing_background_check` (boolean)
- `willing_drug_screen` (boolean)
- `failed_or_refused_drug_test` (boolean)
- `uses_substances_affecting_duties` (boolean)
- `substances_description` (string)
- `can_provide_legal_docs` (boolean)
- `is_hispanic_latino` (string)
- `race_ethnicity` (string)
- `veteran_status` (string)
- `disability_status` (string)
- `has_relatives_in_company` (boolean)
- `relatives_details` (string)
- `client_form_fill_date` (string, ISO timestamp)
- `cover_letter_path` (string)
- `full_address` (string)
- `date_of_birth` (string, ISO date)
- `primary_phone` (string)
- `is_new_domain` (boolean, default: true for pending clients)
- `add_ons_info` (array of strings)
- `exclude_companies` (string, default: "NA")

---

## Pending Client Specific Behavior

### Email Mapping
- `email` → both `company_email` AND `personal_email`
- If `personal_email` is provided separately, it will be used; otherwise `email` is used for both

### Phone Mapping
- `phone` → `whatsapp_number`, `callable_phone`, AND `primary_phone` (all three fields)

### Default Values (Pending Mode)
- `submitted_by`: `d92f960d-b244-45e8-a13d-d0ad08828c89`
- `no_of_applications`: `"20"`
- `experience`: `"0"` (if not provided)
- `exclude_companies`: `"NA"`
- `is_new_domain`: `true`
- `badge_value`: `0`
- `sponsorship`: `false`

### Duplicate Email Check
The endpoint checks for duplicate emails in the `pending_clients` table:
- Checks both `company_email` and `personal_email`
- Returns **409 Conflict** if email already exists

---

## Error Responses

### Validation Error (400)
```json
{
  "error": "Validation failed",
  "details": [
    "Missing required field: full_name",
    "Invalid email format"
  ]
}
```

### Duplicate Email (409)
```json
{
  "error": "Email already exists",
  "details": "A pending client with email jane.smith@example.com already exists"
}
```

### Server Error (500)
```json
{
  "error": "Failed to create pending client",
  "details": "Database error message"
}
```

---

## Usage Examples

### JavaScript/TypeScript (Fetch)
```typescript
// Pending Client Submission
const response = await fetch('/api/direct-onboard', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    submission_type: 'pending',
    full_name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1987654321',
    experience: '5',
    applywizz_id: 'APW-67890',
    gender: 'Female',
    state_of_residence: 'New York',
    zip_or_country: '10001',
    resume_s3_path: 'resumes/jane-smith-resume.pdf',
    start_date: '2026-04-01',
    job_role_preferences: ['Data Scientist'],
    visa_type: 'Green Card',
    location_preferences: ['Hybrid']
  })
});

const result = await response.json();
console.log(result);
```

### cURL
```bash
curl -X POST https://your-domain.com/api/direct-onboard \
  -H "Content-Type: application/json" \
  -d '{
    "submission_type": "pending",
    "full_name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+1987654321",
    "experience": "5",
    "applywizz_id": "APW-67890",
    "gender": "Female",
    "state_of_residence": "New York",
    "zip_or_country": "10001",
    "resume_s3_path": "resumes/jane-smith-resume.pdf",
    "start_date": "2026-04-01",
    "job_role_preferences": ["Data Scientist"],
    "visa_type": "Green Card",
    "location_preferences": ["Hybrid"]
  }'
```

---

## Key Differences Between Modes

| Feature | Direct Onboarding | Pending Client |
|---------|------------------|----------------|
| **submission_type** | Not required or "direct" | "pending" |
| **Auth User Creation** | ✅ Yes | ❌ No |
| **Django Sync** | ✅ Yes | ❌ No |
| **Lambda Trigger** | ✅ Yes | ❌ No |
| **Table** | `clients` + `clients_additional_information` | `pending_clients` |
| **Default is_new_domain** | N/A | `true` |
| **submitted_by** | Uses `DEFAULT_ONBOARDED_BY_ID` | Uses `DEFAULT_SUBMITTED_BY_ID` |

---

## Migration Notes

### Before (Separate Endpoints)
- Direct onboarding: `POST /api/direct-onboard`
- Pending clients: `POST /api/pending-client`

### After (Unified Endpoint)
- Direct onboarding: `POST /api/direct-onboard` (no `submission_type` or `submission_type: "direct"`)
- Pending clients: `POST /api/direct-onboard` with `submission_type: "pending"`

### Breaking Changes
⚠️ **None** - The default behavior (without `submission_type`) remains direct onboarding, so existing integrations continue to work.

---

## Benefits of Consolidation
✅ **Saves 1 Vercel Serverless Function slot** (stays within Hobby plan limit)  
✅ **Shared validation logic** (consistent across both modes)  
✅ **Single source of truth** (easier maintenance)  
✅ **Backward compatible** (existing calls work without changes)  
✅ **Clear API contract** (explicit mode selection via `submission_type`)

---

## Testing Checklist
- [ ] Test direct onboarding (without `submission_type`)
- [ ] Test pending client submission (with `submission_type: "pending"`)
- [ ] Test duplicate email detection
- [ ] Test validation errors
- [ ] Test all required fields
- [ ] Test optional fields
- [ ] Verify database records in correct tables
- [ ] Verify no auth user created for pending clients
- [ ] Verify Django sync only happens for direct onboarding

---

## Support
For questions or issues, contact the development team.

**Last Updated:** 2026-02-04
