@echo off
cd /d "%~dp0"
if not exist "venv\Scripts\python.exe" (
  echo No venv found. Create it with:
  echo   python -m venv venv
  echo   venv\Scripts\pip install -r requirements.txt
  exit /b 1
)
call venv\Scripts\activate.bat
python manage.py runserver %*
