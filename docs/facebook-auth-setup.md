# Facebook auth setup

This app uses `react-native-fbsdk-next` for Facebook account linking. Android uses the SDK native login behavior, and the app initializes the Facebook SDK from code before login starts.

## App config

The Facebook SDK plugin is configured in `app.json`.

- `appID`: `874871261609348`
- `scheme`: `fb874871261609348`
- `displayName`: `Flex Used Market`
- `clientToken`: `c0c7165def84af13fe58bfa0df5bff30`

Find the client token in **Meta for Developers -> App settings -> Advanced -> Client token**.

## Meta settings

In **Meta for Developers** for App ID `874871261609348`:

1. Add the **Facebook Login** product.
2. Keep the app in **Development mode** while testing.
3. Add your test account as an **Admin**, **Developer**, or **Tester**.
4. Add the **Android** platform under **Settings -> Basic**.
5. Set the Android package name to `com.anonymous.flexusedmarketfe`.
6. Add the Android key hash for the EAS development build installed on your phone.
7. In **Facebook Login -> Settings**, turn on **Client OAuth Login**.

Do not add `fb874871261609348://authorize` to a field that requires a normal `https://` URL.

## Android key hash

Meta wants the Base64-encoded SHA-1 certificate fingerprint for the Android build that is actually installed on the device.

- For a local debug build:
  - `keytool -exportcert -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore -storepass android -keypass android | openssl sha1 -binary | openssl base64`
- For an EAS development build:
  - Run `eas credentials -p android`.
  - Open the Android credentials for the development profile.
  - Use that signing certificate to generate the hash.
  - Paste the result under **Settings -> Basic -> Android -> Key hashes** in Meta.

## Rebuild requirement

After changing `app.json`, rebuild and reinstall the EAS development build. Native plugin changes do not apply through a Metro refresh.

If Android still shows Facebook's generic "Something went wrong" dialog after a fresh rebuild, re-check the Meta Android package name, EAS development key hash, client token, and app role for the Facebook account being used.
