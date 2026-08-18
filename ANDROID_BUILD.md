# Mealfy - Guia de Build Android

Este documento descreve como compilar o aplicativo Mealfy para Android (APK/AAB).

## Prerequisitos

1. **Node.js** v18+ instalado
2. **Android Studio** instalado (recomendado) ou Android SDK
3. **Java JDK 17+** instalado
4. **Gradle** (ja incluido no projeto via wrapper)

## Estrutura do Projeto

```
mealfy/
├── src/                    # Codigo fonte React/TypeScript
├── dist/                   # Build web (gerado pelo Vite)
├── android/                # Projeto Android nativo (Capacitor)
├── capacitor.config.ts     # Configuracao do Capacitor
└── package.json            # Dependencias e scripts
```

## Comandos Disponiveis

### Desenvolvimento Web
```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build de producao web
npm run preview      # Preview do build web
```

### Android
```bash
npm run android:build    # Build web + sync com Android
npm run cap:sync         # Sincroniza arquivos web com Android
npm run cap:open:android # Abre o projeto no Android Studio
```

## Como Gerar um APK

### Metodo 1: Via Android Studio (Recomendado)

1. **Build o projeto web:**
   ```bash
   npm run android:build
   ```

2. **Abra no Android Studio:**
   ```bash
   npm run cap:open:android
   ```

3. **No Android Studio:**
   - Aguarde a indexacao do Gradle
   - Va em `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - O APK sera gerado em `android/app/build/outputs/apk/debug/`

### Metodo 2: Via Linha de Comando

```bash
# Build web
npm run build

# Sync com Android
npx cap sync android

# Navegue para a pasta android
cd android

# Build debug APK
./gradlew assembleDebug

# APK estara em: app/build/outputs/apk/debug/app-debug.apk
```

### Metodo 3: Build de Release (Assinado)

1. **Crie uma keystore:**
   ```bash
   keytool -genkey -v -keystore mealfy.keystore -alias mealfy -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Crie o arquivo `android/keystore.properties`:**
   ```properties
   storePassword=SUA_SENHA
   keyPassword=SUA_SENHA
   keyAlias=mealfy
   storeFile=../mealfy.keystore
   ```

3. **Modifique `android/app/build.gradle` para incluir:**
   ```gradle
   // Adicione no inicio do arquivo
   def keystorePropertiesFile = rootProject.file("keystore.properties")
   def keystoreProperties = new Properties()
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }

   android {
       // ...
       
       signingConfigs {
           release {
               if (keystorePropertiesFile.exists()) {
                   storeFile file(keystoreProperties['storeFile'])
                   storePassword keystoreProperties['storePassword']
                   keyAlias keystoreProperties['keyAlias']
                   keyPassword keystoreProperties['keyPassword']
               }
           }
       }
       
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled false
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

4. **Build release:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

5. **APK assinado em:** `app/build/outputs/apk/release/app-release.apk`

## Como Gerar um AAB (Google Play)

```bash
cd android
./gradlew bundleRelease
```

O AAB estara em: `app/build/outputs/bundle/release/app-release.aab`

## Configuracoes Importantes

### Permissoes Android
As seguintes permissoes estao configuradas no `AndroidManifest.xml`:
- `INTERNET` - Para conexao com API
- `ACCESS_COARSE_LOCATION` - Localizacao aproximada
- `ACCESS_FINE_LOCATION` - Localizacao precisa (mapa)
- `ACCESS_NETWORK_STATE` - Estado da rede

### Plugins Capacitor Instalados
- `@capacitor/geolocation` - Geolocalizacao
- `@capacitor/browser` - Abrir URLs externas
- `@capacitor/status-bar` - Controle da barra de status

## Solucao de Problemas

### Erro: "SDK location not found"
Crie o arquivo `android/local.properties`:
```
sdk.dir=/caminho/para/Android/sdk
```

### Erro de Gradle
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### Viewport incorreto no Android
O app ja esta configurado com viewport adequado no `index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
```

## Build Completo via Script

Crie `build-android.sh`:
```bash
#!/bin/bash
echo "Building Mealfy Android..."

# Build web
npm run build

# Sync Capacitor
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug

echo "APK disponivel em: android/app/build/outputs/apk/debug/app-debug.apk"
```

## Publicacao na Google Play

1. **Build AAB assinado:**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

2. **Upload no Google Play Console:**
   - Va para `Release > Production`
   - Clique em `Create new release`
   - Upload do AAB de `app/build/outputs/bundle/release/app-release.aab`

## Contato

Para duvidas sobre o build, consulte a documentacao do Capacitor:
https://capacitorjs.com/docs/android
