@echo off
setlocal

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%"
if not defined NODE_ENV set "NODE_ENV=development"

for /f "skip=1 tokens=1,2" %%A in ('adb devices') do (
  if "%%B"=="device" (
    echo Setting backend tunnel for %%A on tcp:3001...
    adb -s %%A reverse tcp:3001 tcp:3001 >nul 2>nul
  )
)

call "%~dp0..\node_modules\.bin\expo.cmd" run:android %*
