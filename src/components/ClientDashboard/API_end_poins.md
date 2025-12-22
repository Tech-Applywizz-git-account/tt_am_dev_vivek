## /api/job-links (Scored Jobs)

### Mode 1: Summary
```bash
# All jobs
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49"

# Easy apply only
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&apply_type=EASY_APPLY"

# Regular only
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&apply_type=REGULAR"
```

### Mode 2: Date Filtering
```bash
# Regular jobs for date
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&date=2025-09-12"

# Easy apply for date
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&date=2025-09-12&apply_type=EASY_APPLY"
```

### Mode 3: Pagination
```bash
# Basic pagination
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&page=1&page_size=10"

# With apply type filter
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&page=1&apply_type=EASY_APPLY"

# With status filter
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&page=1&status=Pending"

# With sorting
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&page=1&sort_by=score&order=desc"
```

---

## 🔗 /api/job-links Endpoint Tests

### **MODE 1: Summary (Job Counts)**

#### ✅ Test 1: All Jobs Summary
```bash
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49"
```
**Status:** 200 OK
**Response:**
```json
{
  "regular_jobs": {"2025-09-11": 20, "2025-09-12": 89},
  "easy_apply_jobs": {"2025-09-12": 1},
  "summary": {
    "total": 110,
    "by_status": {"null": 109, "Pending": 1},
    "by_apply_type": {"regular": 109, "easy_apply": 1}
  }
}
```

#### ✅ Test 2: Easy Apply Only Summary
```bash
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&apply_type=EASY_APPLY"
```
**Status:** 200 OK
**Response:**
```json
{
  "easy_apply_jobs": {"2025-09-12": 1},
  "summary": {
    "total": 1,
    "by_status": {"Pending": 1},
    "by_apply_type": {"easy_apply": 1}
  }
}
```

#### ✅ Test 3: Regular Jobs Only Summary
```bash
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&apply_type=REGULAR"
```
**Status:** 200 OK
**Response:**
```json
{
  "regular_jobs": {"2025-09-11": 20, "2025-09-12": 89},
  "summary": {
    "total": 109,
    "by_status": {"null": 109},
    "by_apply_type": {"regular": 109}
  }
}
```

---

### **MODE 2: Date Filtering**

#### ✅ Test 4: Regular Jobs for Date
```bash
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&date=2025-09-12"
```
**Status:** 200 OK
**Response Size:** 39,717 bytes (89 jobs)
**Contains:** Full job details for 89 regular jobs

#### ✅ Test 5: Easy Apply Jobs for Date
```bash
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&date=2025-09-12&apply_type=EASY_APPLY"
```
**Status:** 200 OK
**Response:**
```json
{
  "easyapply": [...],  // 1 job
  "date": "2025-09-12",
  "total": 1
}
```

---

### **MODE 3: Pagination**

#### ✅ Test 6: Basic Pagination
```bash
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&page=1&page_size=10"
```
**Status:** 200 OK
**Response Size:** 4,633 bytes
**Response:**
```json
{
  "jobs": [...],  // 10 jobs
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 110,
    "total_pages": 11
  },
  "filters": {...}
}
```

#### ✅ Test 7: Pagination with Apply Type Filter
```bash
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&page=1&apply_type=EASY_APPLY"
```
**Status:** 200 OK
**Response Size:** 646 bytes
**Response:**
```json
{
  "jobs": [...],  // 1 easy apply job
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total": 1,
    "total_pages": 1
  },
  "filters": {"apply_type": "EASY_APPLY", ...}
}
```

#### ✅ Test 8: Pagination with Status Filter
```bash
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&page=1&status=Pending"
```
**Status:** 200 OK
**Response Size:** 22,477 bytes
**Filters:** Only jobs with status="Pending"

#### ✅ Test 9: Pagination with Sort Options
```bash
curl "http://127.0.0.1:8000/api/job-links?lead_id=AWL-49&page=1&sort_by=date&order=desc"
```
**Status:** 200 OK
**Sorted By:** generatedAt (newest first)

---
