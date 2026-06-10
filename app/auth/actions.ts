'use server'

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function initDb() {
  // Ensure uuid extension exists
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  
  // Create table users
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      phone VARCHAR(50),
      role VARCHAR(50) DEFAULT 'pelanggan'
    );
  `;

  // Seed 1 courier user if not exists
  const courierExists = await sql`SELECT id FROM users WHERE email = 'kurir@kurir.com'`;
  if (courierExists.length === 0) {
    const hashedPwd = await bcrypt.hash('kurir123', 10);
    await sql`
      INSERT INTO users (name, email, password, phone, role)
      VALUES ('Kurir Satu', 'kurir@kurir.com', ${hashedPwd}, '081234567890', 'kurir')
    `;
  }

  // Seed 1 customer user if not exists
  const customerExists = await sql`SELECT id FROM users WHERE email = 'pelanggan@gmail.com'`;
  if (customerExists.length === 0) {
    const hashedPwd = await bcrypt.hash('pelanggan123', 10);
    await sql`
      INSERT INTO users (name, email, password, phone, role)
      VALUES ('Pelanggan Satu', 'pelanggan@gmail.com', ${hashedPwd}, '089876543210', 'pelanggan')
    `;
  }
}

export async function login(formData: FormData) {
  const emailInput = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!emailInput || !password) {
    return { error: 'Email dan password wajib diisi' };
  }

  const email = emailInput.toLowerCase().trim();

  try {
    await initDb();

    // Query user by email
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (users.length === 0) {
      return { error: 'Email atau password salah' };
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return { error: 'Email atau password salah' };
    }

    // Set a session cookie
    const cookieStore = await cookies();
    cookieStore.set('session_user', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

  } catch (err: any) {
    console.error('Login error:', err);
    return { error: 'Terjadi kesalahan pada server' };
  }

  revalidatePath('/', 'layout');

  // Redirect based on email domain
  if (email.endsWith('@kurir.com')) {
    redirect('/kurir');
  } else {
    redirect('/pelanggan/dashboard');
  }
}

export async function register(formData: FormData) {
  const emailInput = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;

  if (!emailInput || !password || !name) {
    return { error: 'Nama, Email, dan Password wajib diisi' };
  }

  const email = emailInput.toLowerCase().trim();

  try {
    await initDb();

    // Check if email already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return { error: 'Email sudah terdaftar' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Determine role based on email domain
    const role = email.endsWith('@kurir.com') ? 'kurir' : 'pelanggan';

    await sql`
      INSERT INTO users (name, email, password, phone, role)
      VALUES (${name}, ${email}, ${hashedPassword}, ${phone || null}, ${role})
    `;

  } catch (err: any) {
    console.error('Registration error:', err);
    return { error: 'Gagal mendaftarkan akun baru' };
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session_user');
  revalidatePath('/', 'layout');
  redirect('/login');
}
