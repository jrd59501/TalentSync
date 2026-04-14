# TalentSync Demo Commands (PowerShell)

These commands are machine-agnostic.
Run them from the project root (the folder that contains `package.json`).

## 1) Confirm you are in the project root

```powershell
Get-ChildItem package.json
```

If this file is not found, `Set-Location` into the cloned project folder first.

## 2) One-time install

```powershell
npm install
npm run ui:install
```

## 3) Start backend API (Terminal A)

```powershell
npm run build
npm start
```

Backend URL: `http://localhost:3000`

## 4) Start React UI (Terminal B)

```powershell
npm run ui:dev
```

Frontend URL: `http://localhost:5173`

## 5) Optional CLI demos (Terminal C)

Interactive all-in-one demo:

```powershell
npm run demo
```

Interactive employer menu:

```powershell
npm run cli:employer
```

## 6) Open extra PowerShell windows from current folder (optional)

Open backend in a new window:

```powershell
Start-Process powershell -WorkingDirectory (Get-Location) -ArgumentList '-NoExit','-Command','npm run build; npm start'
```

Open UI in a new window:

```powershell
Start-Process powershell -WorkingDirectory (Get-Location) -ArgumentList '-NoExit','-Command','npm run ui:dev'
```

Open CLI demo in a new window:

```powershell
Start-Process powershell -WorkingDirectory (Get-Location) -ArgumentList '-NoExit','-Command','npm run demo'
```

## 7) Quick pre-class checks

```powershell
npm run build
npm test
```
