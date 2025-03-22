@echo off
powershell "./clean.bat" && powershell "./build.bat" && echo  -- starting server && powershell "npm start"
pause