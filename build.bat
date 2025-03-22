@echo off
powershell "./install.bat" && echo  -- linting files && powershell "npx eslint" && echo  -- compiling typescript && powershell "tsc"