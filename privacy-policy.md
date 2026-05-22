# Privacy Policy

**Last updated:** May 22, 2025

## Overview

This application ("ContentDelivery") is a personal content aggregation and publishing tool. It collects trending posts from Reddit, Zhihu, and Workplace Stack Exchange, translates them into Vietnamese, and publishes them to Facebook Pages managed by the operator.

## Data We Collect

This application does **not** collect any data from end users. It is a private, operator-only tool.

The operator configures the following credentials locally:

- **Facebook App ID, App Secret, and Page Access Tokens** — used solely to publish posts to Facebook Pages via the Facebook Graph API.
- **Zhihu Cookie** — used solely to fetch public trending questions from Zhihu.

All credentials are stored locally in environment files (`.env.local`) on the operator's machine and are never transmitted to any third party other than the respective platform APIs.

## Third-Party Services

This application interacts with the following external services on behalf of the operator:

| Service | Purpose | Privacy Policy |
|---|---|---|
| Facebook Graph API | Publish posts to Facebook Pages | https://www.facebook.com/policy.php |
| Reddit API | Fetch trending posts | https://www.reddit.com/policies/privacy-policy |
| Zhihu API | Fetch trending questions | https://www.zhihu.com/terms/privacy |
| Stack Exchange API | Fetch trending Workplace questions | https://stackoverflow.com/legal/privacy-policy |

## Cookies

This application does not set or read cookies from users. The operator's Zhihu `z_c0` session cookie is stored locally and used only for server-to-server API requests.

## Data Retention

No user data is stored. Operator credentials are stored locally and can be deleted at any time by removing the `.env.local` file.

## Contact

For questions about this privacy policy, contact: cvtai105@gmail.com
