# OCR Region Calibration Report

Generated: 2025-12-03T10:27:05.422Z

## FRONT Page

- Total fields: 30
- Query matched: 13
- Coordinate mismatches: 13

### Coordinate Mismatches

| Field | Label | Distance | Expected (x,y) | Actual (x,y) | Query Value |
|-------|-------|----------|----------------|--------------|-------------|
| testDate | Test Date | 0.347 | (0.065, 0.130) | (0.283, 0.418) | 12 02 2025 |
| philHealthNumber | PhilHealth Number | 0.285 | (0.145, 0.165) | (0.263, 0.449) | 01 - 234 567890 - 1 |
| firstName | First Name | 0.266 | (0.050, 0.235) | (0.189, 0.508) | Jane |
| middleName | Middle Name | 0.263 | (0.320, 0.235) | (0.415, 0.508) | Cata |
| lastName | Last Name | 0.276 | (0.590, 0.235) | (0.639, 0.510) | Doe |
| suffix | Suffix | 0.282 | (0.890, 0.235) | (0.826, 0.511) | Sr |
| parentalCodeFather | Parental Code - Father's First Name (First 2 letters) | 0.288 | (0.480, 0.275) | (0.433, 0.551) | CD |
| birthOrder | Birth Order | 0.270 | (0.700, 0.275) | (0.714, 0.554) | 02 |
| birthDate | Birth Date | 0.303 | (0.120, 0.305) | (0.282, 0.576) | 11 08 1999 |
| age | Age | 0.293 | (0.350, 0.305) | (0.492, 0.578) | 26 |
| ageMonths | Age in Months (for less than 1 year old) | 0.430 | (0.480, 0.305) | (0.830, 0.580) | 03 |
| sex | Sex (assigned at birth) | 0.295 | (0.160, 0.335) | (0.372, 0.607) | Female |
| nationality | Nationality | 0.319 | (0.130, 0.455) | (0.489, 0.673) | Chinese |

### Suggested Coordinate Updates

```json
{
  "testDate": {
    "label": "Test Date",
    "region": {
      "x": 0.283,
      "y": 0.418,
      "width": 0.124,
      "height": 0.009
    },
    "reasoning": "Query matched with 93% confidence at different location"
  },
  "philHealthNumber": {
    "label": "PhilHealth Number",
    "region": {
      "x": 0.263,
      "y": 0.449,
      "width": 0.253,
      "height": 0.01
    },
    "reasoning": "Query matched with 20% confidence at different location"
  },
  "firstName": {
    "label": "First Name",
    "region": {
      "x": 0.189,
      "y": 0.508,
      "width": 0.043,
      "height": 0.011
    },
    "reasoning": "Query matched with 100% confidence at different location"
  },
  "middleName": {
    "label": "Middle Name",
    "region": {
      "x": 0.415,
      "y": 0.508,
      "width": 0.043,
      "height": 0.011
    },
    "reasoning": "Query matched with 99% confidence at different location"
  },
  "lastName": {
    "label": "Last Name",
    "region": {
      "x": 0.639,
      "y": 0.51,
      "width": 0.031,
      "height": 0.011
    },
    "reasoning": "Query matched with 99% confidence at different location"
  },
  "suffix": {
    "label": "Suffix",
    "region": {
      "x": 0.826,
      "y": 0.511,
      "width": 0.021,
      "height": 0.01
    },
    "reasoning": "Query matched with 90% confidence at different location"
  },
  "parentalCodeFather": {
    "label": "Parental Code - Father's First Name (First 2 letters)",
    "region": {
      "x": 0.433,
      "y": 0.551,
      "width": 0.029,
      "height": 0.008
    },
    "reasoning": "Query matched with 99% confidence at different location"
  },
  "birthOrder": {
    "label": "Birth Order",
    "region": {
      "x": 0.714,
      "y": 0.554,
      "width": 0.027,
      "height": 0.008
    },
    "reasoning": "Query matched with 96% confidence at different location"
  },
  "birthDate": {
    "label": "Birth Date",
    "region": {
      "x": 0.282,
      "y": 0.576,
      "width": 0.125,
      "height": 0.011
    },
    "reasoning": "Query matched with 97% confidence at different location"
  },
  "age": {
    "label": "Age",
    "region": {
      "x": 0.492,
      "y": 0.578,
      "width": 0.028,
      "height": 0.009
    },
    "reasoning": "Query matched with 99% confidence at different location"
  },
  "ageMonths": {
    "label": "Age in Months (for less than 1 year old)",
    "region": {
      "x": 0.83,
      "y": 0.58,
      "width": 0.031,
      "height": 0.011
    },
    "reasoning": "Query matched with 78% confidence at different location"
  },
  "sex": {
    "label": "Sex (assigned at birth)",
    "region": {
      "x": 0.372,
      "y": 0.607,
      "width": 0.04,
      "height": 0.008
    },
    "reasoning": "Query matched with 97% confidence at different location"
  },
  "nationality": {
    "label": "Nationality",
    "region": {
      "x": 0.489,
      "y": 0.673,
      "width": 0.06,
      "height": 0.01
    },
    "reasoning": "Query matched with 64% confidence at different location"
  }
}
```

## BACK Page

- Total fields: 21
- Query matched: 4
- Coordinate mismatches: 4

### Coordinate Mismatches

| Field | Label | Distance | Expected (x,y) | Actual (x,y) | Query Value |
|-------|-------|----------|----------------|--------------|-------------|
| previousTestResult | What was the result | 0.134 | (0.200, 0.535) | (0.412, 0.460) | Non-reactive |
| clinicalPicture | Clinical Picture | 0.125 | (0.160, 0.655) | (0.259, 0.544) | Asymptomatic |
| testingFacility | Name of Testing Facility/Organization | 0.183 | (0.400, 0.985) | (0.514, 0.816) | LoveYourself Inc. (Bagani) |
| emailAddress | Email address | 0.162 | (0.580, 1.010) | (0.686, 0.851) | info@baganiph.org |

### Suggested Coordinate Updates

```json
{
  "previousTestResult": {
    "label": "What was the result",
    "region": {
      "x": 0.412,
      "y": 0.46,
      "width": 0.066,
      "height": 0.007
    },
    "reasoning": "Query matched with 96% confidence at different location"
  },
  "clinicalPicture": {
    "label": "Clinical Picture",
    "region": {
      "x": 0.259,
      "y": 0.544,
      "width": 0.076,
      "height": 0.009
    },
    "reasoning": "Query matched with 98% confidence at different location"
  },
  "testingFacility": {
    "label": "Name of Testing Facility/Organization",
    "region": {
      "x": 0.514,
      "y": 0.816,
      "width": 0.184,
      "height": 0.013
    },
    "reasoning": "Query matched with 87% confidence at different location"
  },
  "emailAddress": {
    "label": "Email address",
    "region": {
      "x": 0.686,
      "y": 0.851,
      "width": 0.124,
      "height": 0.011
    },
    "reasoning": "Query matched with 97% confidence at different location"
  }
}
```

