-- Add unique index on User.email
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

