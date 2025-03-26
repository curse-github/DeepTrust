@echo off
powershell "./build.bat" && echo  -- starting server && powershell "npm start"
pause