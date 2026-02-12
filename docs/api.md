# ReadyKids CMA - API Reference

Base URL: `http://localhost:3000`

All endpoints accept and return JSON. Set `Content-Type: application/json` for
request bodies.

---

## Applications

### List all applications

```
GET /api/applications
```

Returns an array of application objects in the dashboard format. Applications
are ordered by creation date, newest first.

**Response:** `200 OK`

```json
[
  {
    "id": "RK-2024-00098",
    "name": "Rebecca Morrison",
    "email": "rebecca.morrison@email.com",
    "phone": "07712 345678",
    "dob": "1985-03-15",
    "stage": "registered",
    "startDate": "2024-08-15",
    "registrationDate": "2024-10-22",
    "registrationNumber": "EY123456",
    "lastUpdated": "2024-10-22",
    "daysInStage": 142,
    "risk": "low",
    "progress": 100,
    "premisesType": "domestic",
    "premisesAddress": "42 Willow Gardens, Bristol, BS8 4TH",
    "localAuthority": "Bristol",
    "registers": ["0-5", "5-7"],
    "checks": { ... },
    "connectedPersons": [ ... ],
    "ofstedCheck": { ... },
    "timeline": [ ... ]
  }
]
```

---

### Get single application

```
GET /api/applications/:id
```

**Parameters:**

| Name | In   | Description                              |
| ---- | ---- | ---------------------------------------- |
| `id` | path | Application ID (e.g. `RK-2024-00098`)    |

**Response:** `200 OK` with the application object, or `404` if not found.

---

### Create application

```
POST /api/applications
```

Accepts the structured form payload from the registration form. The server
generates the application ID, sets `stage` to `new`, calculates initial
`progress` from training/DBS data, and creates two timeline events.

**Required fields:**

| Field                | Type   | Description        |
| -------------------- | ------ | ------------------ |
| `personal.firstName` | string | Applicant first name |
| `personal.lastName`  | string | Applicant last name  |
| `personal.email`     | string | Applicant email      |

**Request body structure:**

```json
{
  "personal": {
    "title": "Mrs",
    "firstName": "Jane",
    "lastName": "Smith",
    "middleNames": "",
    "gender": "Female",
    "dob": "1990-05-15",
    "rightToWork": "Yes, I am a British Citizen",
    "email": "jane@example.com",
    "phone": "07123 456789",
    "niNumber": "AB 12 34 56 C"
  },
  "previousNames": [],
  "homeAddress": {
    "line1": "10 High Street",
    "line2": "",
    "town": "Bristol",
    "postcode": "BS1 1AA",
    "moveIn": "2020-01-15"
  },
  "addressHistory": [],
  "premises": {
    "type": "Domestic",
    "sameAsHome": true,
    "localAuthority": "Bristol",
    "address": null,
    "outdoorSpace": "Yes",
    "pets": "No",
    "petsDetails": ""
  },
  "service": {
    "ageGroups": ["0-5", "5-7"],
    "workWithOthers": "No",
    "numberOfAssistants": ""
  },
  "qualifications": {
    "firstAidCompleted": "Yes",
    "firstAidOrg": "St Johns Ambulance",
    "firstAidDate": "2024-06-15",
    "safeguardingCompleted": "Yes",
    "safeguardingOrg": "EduCare",
    "safeguardingDate": "2024-07-01",
    "foodHygieneCompleted": "No",
    "foodHygieneOrg": "",
    "foodHygieneDate": ""
  },
  "employment": [
    {
      "employer": "Bright Futures Nursery",
      "jobTitle": "Nursery Assistant",
      "startDate": "2018-09-01",
      "endDate": "2024-01-31"
    }
  ],
  "references": {
    "ref1": {
      "name": "Sarah Manager",
      "relationship": "Former Employer",
      "email": "sarah@nursery.com",
      "phone": "07111 222333"
    },
    "ref2": {
      "name": "Dr Mark GP",
      "relationship": "Health Visitor",
      "email": "mark@nhs.uk",
      "phone": ""
    }
  },
  "household": {
    "adultsInHome": "Yes",
    "adults": [
      {
        "firstName": "John",
        "lastName": "Smith",
        "dob": "1988-03-20",
        "relationship": "Partner"
      }
    ],
    "childrenInHome": "No",
    "children": []
  },
  "suitability": {
    "healthCondition": "No",
    "disqualified": "No",
    "socialServices": "No",
    "hasDBS": "Yes",
    "dbsNumber": "001234567890"
  },
  "declaration": {
    "consent1": true,
    "consent2": true,
    "consent3": true,
    "consent4": true,
    "consent5": true,
    "signature": "Jane Smith",
    "printName": "JANE SMITH",
    "date": "2025-02-11"
  }
}
```

**Response:** `201 Created`

```json
{
  "id": "RK-2025-00200",
  "message": "Application submitted successfully"
}
```

**Error:** `400 Bad Request` if required fields are missing.

---

### Update application

```
PATCH /api/applications/:id
```

Partially update an application. Only allowlisted fields are accepted.
The `last_updated` timestamp is set automatically.

**Allowed fields:**

| Field                | Type   | Description                     |
| -------------------- | ------ | ------------------------------- |
| `stage`              | string | Pipeline stage                  |
| `risk`               | string | Risk level (`low`, `medium`, `high`) |
| `progress`           | number | Completion percentage (0-100)   |
| `checks`             | object | Compliance check statuses       |
| `connectedPersons`   | array  | Household/assistant records     |
| `ofstedCheck`        | object | Ofsted history check result     |
| `registrationDate`   | string | Date of registration (YYYY-MM-DD) |
| `registrationNumber` | string | Ofsted registration number      |

**Request body example:**

```json
{
  "stage": "checks",
  "progress": 45
}
```

**Response:** `200 OK` with `{ "message": "Application updated" }`,
or `404` if not found.

---

### Delete application

```
DELETE /api/applications/:id
```

Permanently remove an application and all associated timeline events
(cascading delete).

**Response:** `200 OK` with `{ "message": "Application deleted" }`,
or `404` if not found.

---

## Timeline Events

### Add timeline event

```
POST /api/applications/:id/timeline
```

Append an audit log entry to an application's timeline.

**Request body:**

| Field   | Type   | Required | Description                                |
| ------- | ------ | -------- | ------------------------------------------ |
| `event` | string | yes      | Event description                          |
| `type`  | string | no       | One of `action`, `complete`, `alert`, `note`. Defaults to `action`. |

**Request body example:**

```json
{
  "event": "DBS certificate received - clear",
  "type": "complete"
}
```

**Response:** `201 Created` with the created event record.

---

## Application Stages

Applications move through these stages:

```
new -> form-submitted -> checks -> review -> approved -> registered
                                      \-> blocked (can re-enter review)
```

| Stage            | Description                                  |
| ---------------- | -------------------------------------------- |
| `new`            | Application created, no action taken yet     |
| `form-submitted` | Registration form received and accepted      |
| `checks`         | Background checks in progress (DBS, refs, LA) |
| `review`         | All checks done, under final review          |
| `approved`       | Approved, awaiting Ofsted notification       |
| `blocked`        | Escalated due to disclosure or concern       |
| `registered`     | Fully registered with Ofsted number issued   |

---

## Checks Object Structure

Each application has a `checks` object containing 11 compliance items:

| Key            | Description                       |
| -------------- | --------------------------------- |
| `dbs`          | Enhanced DBS check                |
| `dbs_update`   | DBS Update Service subscription   |
| `la_check`     | Local authority children's services check |
| `ofsted`       | Ofsted history check              |
| `gp_health`    | GP health declaration             |
| `ref_1`        | Reference 1                       |
| `ref_2`        | Reference 2                       |
| `first_aid`    | Paediatric First Aid certificate  |
| `safeguarding` | Safeguarding training             |
| `food_hygiene` | Food hygiene certificate          |
| `insurance`    | Public liability insurance        |

Each check has this shape:

```json
{
  "status": "complete | pending | not-started | blocked | expired",
  "date": "2024-09-15",
  "details": "Free text with additional context"
}
```

Some checks include extra fields like `certificate`, `provider`, `referee`,
`relationship`, or `expiryDate` depending on the check type.

---

## Error Responses

All error responses follow this shape:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning                                       |
| ------ | --------------------------------------------- |
| `400`  | Validation error (missing required fields)    |
| `404`  | Resource not found                            |
| `500`  | Server error (database connection, query failure) |
