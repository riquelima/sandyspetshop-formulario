const supabaseUrl = 'https://bbjmlbzcqnhhteyhverk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiam1sYnpjcW5oaHRleWh2ZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTIwMTcsImV4cCI6MjA3NDU2ODAxN30.ljRrFkqmxI0pLKZTGWPcwsbwMnU8_ToIs2nuKegM6s4';

// @ts-ignore - Acessa o objeto global 'supabase' injetado pelo script no index.html
const { createClient } = window.supabase;

export const supabase = createClient(supabaseUrl, supabaseKey);
