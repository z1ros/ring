# ring - how it works

ok so the idea is super simple.

## what happens

1. user comes to landing page, drops phone number
2. our AI calls them in like 10 sec
3. AI asks couple questions (name, age, city, what u want, ideal date, 1 friend who can vouch)
4. we save what they said
5. we send them email with all the info

thats it. one page, one call, one email.

## what we use

- **Next.js** for the website (already done)
- **Supabase** for database (already done)
- **Vapi** for the AI call. this is the main one. it does the voice + AI + transcript for us. if we build it ourselfs from scratch with openai + twilio its like 2 weeks. with vapi its 1 day. so we use vapi.
- **Resend** for sending email. its easy.

dont build the ai call yourself, not worth it. vapi does the hard parts (when user interupts, voicemail, all that).

## how it works in code

ok so basically:

- user types phone on landing, hits the button
- it goes to our backend at `/api/intake`. we save the lead in db and tell vapi "hey call this number"
- vapi calls the user. they talk. user hangs up.
- vapi pings us back at `/api/webhooks/vapi` with the transcript and the answers
- we save it all and fire off the email

so its really just 2 endpoints. one to start the call, one to catch the result. nothing crazy.

## database

2 tables only:

- **Lead** = phone + status (waiting / calling / done)
- **Call** = transcript + answers (as json) + recording link
