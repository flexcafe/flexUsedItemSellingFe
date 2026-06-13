# App Encryption Documentation

**App Name:** Flex Used Market  
**Bundle ID:** `com.flexusedmarket.app`  
**Developer / Support:** Flex Used Market  
**Support Email:** `flexcafe223@hotmail.com`

## Encryption Use Summary
Flex Used Market does not implement proprietary or custom encryption algorithms.

The app uses standard encryption provided by the operating system and trusted third-party services where needed, including:
- HTTPS / TLS for secure network communication with backend services
- Facebook / Meta SDK services for account linking and login-related flows
- Secure storage mechanisms provided by the mobile platform for sensitive tokens and session data

## Non-Exempt Encryption
Based on the current implementation, the app does **not** use non-exempt encryption such as:
- Proprietary encryption algorithms
- Custom encryption algorithms not accepted as standard by international standards bodies
- Standard encryption implemented by the app itself instead of the operating system’s built-in secure transport or storage features

## App Store Declaration
For App Store submission purposes, the app is intended to be treated as using only standard, exempt encryption provided by the platform and common internet security protocols.

## Notes
If the app later adds custom cryptography, encrypted file formats, or any proprietary encryption logic, this documentation should be updated before submission.
