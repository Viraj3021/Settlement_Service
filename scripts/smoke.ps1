$body = Get-Content examples/booking-completed.json -Raw
Invoke-RestMethod -Uri http://localhost:3000/events/booking-completed -Method Post -ContentType 'application/json' -Body $body
Invoke-RestMethod -Uri http://localhost:3000/settlements/bk_8f2a
