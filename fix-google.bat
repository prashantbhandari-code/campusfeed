@echo off
echo Updating Google OAuth credentials on Render...
curl -X PATCH "https://api.render.com/v1/services/srv-da8opjoae00c73dii46g/env-vars/GOOGLE_CLIENT_ID" -H "Authorization: Bearer rnd_SLIdTgKjs0kH9pZ50auCXgdQQFj4" -H "Content-Type: application/json" -d "{\"envVar\":{\"key\":\"GOOGLE_CLIENT_ID\",\"value\":\"696907098890-mue46bbeohbspua1t9r97gpv2ptm1c1j.apps.googleusercontent.com\"}}"
echo.
curl -X PATCH "https://api.render.com/v1/services/srv-da8opjoae00c73dii46g/env-vars/GOOGLE_CLIENT_SECRET" -H "Authorization: Bearer rnd_SLIdTgKjs0kH9pZ50auCXgdQQFj4" -H "Content-Type: application/json" -d "{\"envVar\":{\"key\":\"GOOGLE_CLIENT_SECRET\",\"value\":\"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\"}}"
echo.
echo Done! Go to Render dashboard to deploy.
pause
