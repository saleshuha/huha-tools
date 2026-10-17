# Project architecture

- Trendyol uses server-side production credentials and verified administrator sessions; never send marketplace credentials to the browser.
- Keep Trendyol provider requests in its connection module so Saudi headers and credential redaction remain consistent.