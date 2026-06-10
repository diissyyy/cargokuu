'use server'

import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function initDashboardDb() {
  try {
    
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50) DEFAULT 'pelanggan',
        vehicle_name VARCHAR(255) DEFAULT 'Mobil Box',
        vehicle_type VARCHAR(255) DEFAULT 'Darat (Roda 4)',
        vehicle_plate VARCHAR(50) DEFAULT 'AB 1234 XY',
        vehicle_capacity VARCHAR(100) DEFAULT '1500 kg',
        vehicle_status VARCHAR(100) DEFAULT 'Aktif'
      );
    `;

    
    await sql`
      CREATE TABLE IF NOT EXISTS deliveries (
        id VARCHAR(255) PRIMARY KEY,
        customer VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(50) NOT NULL,
        sender VARCHAR(255) NOT NULL,
        sender_address TEXT,
        sender_phone VARCHAR(50),
        item_name VARCHAR(255) NOT NULL,
        weight DECIMAL NOT NULL,
        ship_service VARCHAR(255) NOT NULL,
        price INT NOT NULL,
        status VARCHAR(100) DEFAULT 'Tersedia',
        notes TEXT,
        courier_id UUID REFERENCES users(id) ON DELETE SET NULL,
        vehicle_name VARCHAR(255),
        vehicle_type VARCHAR(255),
        vehicle_plate VARCHAR(50),
        vehicle_capacity VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    
    await sql`
      CREATE TABLE IF NOT EXISTS history_logs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        delivery_id VARCHAR(255) REFERENCES deliveries(id) ON DELETE CASCADE,
        status VARCHAR(100) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    
    await sql`
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        label VARCHAR(255) NOT NULL,
        contact VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    
    const courierCount = await sql`SELECT id FROM users WHERE email = 'kurir@kurir.com'`;
    let kurirId = courierCount[0]?.id;
    if (courierCount.length === 0) {
      const hashedPwd = await bcrypt.hash('kurir123', 10);
      const inserted = await sql`
        INSERT INTO users (name, email, password, phone, role, vehicle_name, vehicle_type, vehicle_plate, vehicle_capacity)
        VALUES ('Kurir Satu', 'kurir@kurir.com', ${hashedPwd}, '081234567890', 'kurir', 'Mobil L300', 'Darat (Roda 4)', 'AB 9876 CD', '1200 kg')
        RETURNING id
      `;
      kurirId = inserted[0].id;
    }

    const customerCount = await sql`SELECT id FROM users WHERE email = 'pelanggan@gmail.com'`;
    let pelangganId = customerCount[0]?.id;
    if (customerCount.length === 0) {
      const hashedPwd = await bcrypt.hash('pelanggan123', 10);
      const inserted = await sql`
        INSERT INTO users (name, email, password, phone, role)
        VALUES ('Pelanggan Satu', 'pelanggan@gmail.com', ${hashedPwd}, '089876543210', 'pelanggan')
        RETURNING id
      `;
      pelangganId = inserted[0].id;
    }

    
    if (pelangganId) {
      const addressCount = await sql`SELECT id FROM addresses WHERE user_id = ${pelangganId}`;
      if (addressCount.length === 0) {
        await sql`
          INSERT INTO addresses (user_id, label, contact, phone, details)
          VALUES 
            (${pelangganId}, 'Rumah (Utama)', 'Pelanggan Satu', '089876543210', 'Jl. Kaliurang KM 5, Sleman, Yogyakarta'),
            (${pelangganId}, 'Gudang Sunter', 'Budi Santoso', '081234567890', 'Kawasan Industri Sunter Blok C/10, Jakarta Utara'),
            (${pelangganId}, 'Kantor Depok', 'Siti Rahma', '08987654321', 'Ruko Margonda Raya No. 45, Depok')
        `;
      }
    }

    
    const shipmentCount = await sql`SELECT id FROM deliveries`;
    if (shipmentCount.length === 0) {
      
      await sql`
        INSERT INTO deliveries (id, customer, address, phone, sender, sender_address, sender_phone, item_name, weight, ship_service, price, status, notes, courier_id)
        VALUES (
          'JNT123XXX', 
          'Toko Maju Jaya', 
          'Bandung, Jawa Barat', 
          '0899887766', 
          'Gudang Jakarta', 
          'Jakarta Timur', 
          '021-998877', 
          'Komponen Elektronik', 
          2.8, 
          'Cargo Reguler', 
          28000, 
          'Sedang Dikirim', 
          'Dalam perjalanan menuju Bandung',
          ${kurirId || null}
        )
      `;

      
      await sql`
        INSERT INTO history_logs (delivery_id, status, notes, created_at)
        VALUES 
          ('JNT123XXX', 'Paket diterima', 'Diterima oleh Gudang Jakarta', NOW() - INTERVAL '3 days'),
          ('JNT123XXX', 'Dalam perjalanan', 'Menuju kota Bandung', NOW() - INTERVAL '2 days'),
          ('JNT123XXX', 'Tiba di kota tujuan', 'Bandung, sorting hub', NOW() - INTERVAL '1 day'),
          ('JNT123XXX', 'Menuju alamat tujuan', 'Kurir Anton Budiman menuju lokasi', NOW())
      `;

      
      await sql`
        INSERT INTO deliveries (id, customer, address, phone, sender, sender_address, sender_phone, item_name, weight, ship_service, price, status, notes)
        VALUES (
          'JNT482030ID', 
          'Ibu Yani', 
          'Jl. Kaliurang KM 5, Sleman', 
          '08123456789', 
          'Pelanggan Satu', 
          'Gudang Jakarta, Jakarta Timur', 
          '089876543210', 
          'Pakaian / Garment', 
          1.2, 
          'Cargo Reguler', 
          12000, 
          'Tersedia', 
          'Titip di pos satpam jika tidak di rumah'
        )
      `;
      await sql`
        INSERT INTO history_logs (delivery_id, status, notes)
        VALUES ('JNT482030ID', 'Tersedia', 'Menunggu kurir menjemput paket')
      `;

      
      await sql`
        INSERT INTO deliveries (id, customer, address, phone, sender, sender_address, sender_phone, item_name, weight, ship_service, price, status, notes, courier_id)
        VALUES (
          'JNT948271ID', 
          'Pak Budi', 
          'Perum Condongcatur C4, Sleman', 
          '08987654321', 
          'Pelanggan Satu', 
          'Gudang Jakarta, Jakarta Timur', 
          '089876543210', 
          'Buku Pelajaran', 
          2.5, 
          'Cargo Express', 
          62500, 
          'Selesai', 
          'Diterima langsung oleh yang bersangkutan',
          ${kurirId || null}
        )
      `;
      await sql`
        INSERT INTO history_logs (delivery_id, status, notes, created_at)
        VALUES 
          ('JNT948271ID', 'Tersedia', 'Menunggu penjemputan', NOW() - INTERVAL '2 hours'),
          ('JNT948271ID', 'Sedang Dikirim', 'Paket dalam perjalanan', NOW() - INTERVAL '1 hour'),
          ('JNT948271ID', 'Selesai', 'Paket telah sukses dikirim (Diterima langsung)', NOW())
      `;

      
      await sql`
        INSERT INTO deliveries (id, customer, address, phone, sender, sender_address, sender_phone, item_name, weight, ship_service, price, status, notes, courier_id)
        VALUES (
          'JNT204859ID', 
          'Joko Susilo', 
          'Jl. Kusumanegara No. 89, Kota', 
          '0822334455', 
          'Pelanggan Satu', 
          'Gudang Jakarta, Jakarta Timur', 
          '089876543210', 
          'Suku Cadang Motor', 
          3.2, 
          'Cargo Reguler', 
          32000, 
          'Gagal', 
          'Penerima tidak di rumah - Rumah terkunci rapat',
          ${kurirId || null}
        )
      `;
      await sql`
        INSERT INTO history_logs (delivery_id, status, notes, created_at)
        VALUES 
          ('JNT204859ID', 'Tersedia', 'Menunggu penjemputan', NOW() - INTERVAL '2 hours'),
          ('JNT204859ID', 'Sedang Dikirim', 'Paket dalam perjalanan', NOW() - INTERVAL '1 hour'),
          ('JNT204859ID', 'Gagal', 'Penerima tidak di rumah - Rumah terkunci rapat', NOW())
      `;
    }
    
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Database migration/seed error:', error);
  }
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session_user')?.value;
    if (!session) return null;
    return JSON.parse(session);
  } catch (e) {
    return null;
  }
}


export async function createDelivery(data: {
  customer: string;
  address: string;
  phone: string;
  sender: string;
  sender_address: string;
  sender_phone: string;
  item_name: string;
  weight: number;
  ship_service: string;
  price: number;
  notes?: string;
}) {
  try {
    await initDashboardDb();
    
    
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const resiCode = `JNT${randomDigits}ID`;

    await sql`
      INSERT INTO deliveries (
        id, customer, address, phone, sender, sender_address, sender_phone, 
        item_name, weight, ship_service, price, status, notes
      )
      VALUES (
        ${resiCode}, ${data.customer}, ${data.address}, ${data.phone}, 
        ${data.sender}, ${data.sender_address}, ${data.sender_phone}, 
        ${data.item_name}, ${data.weight}, ${data.ship_service}, ${data.price}, 
        'Tersedia', ${data.notes || ''}
      )
    `;

    
    await sql`
      INSERT INTO history_logs (delivery_id, status, notes)
      VALUES (${resiCode}, 'Tersedia', 'Menunggu kurir menjemput paket')
    `;

    revalidatePath('/pelanggan/dashboard');
    revalidatePath('/kurir');
    return { success: true, resiCode, price: data.price };
  } catch (err: any) {
    console.error('Error creating delivery:', err);
    return { error: 'Gagal membuat pengiriman baru: ' + err.message };
  }
}


export async function fetchDeliveries() {
  try {
    await initDashboardDb();
    return await sql`SELECT * FROM deliveries ORDER BY created_at DESC`;
  } catch (err) {
    console.error('Error fetching deliveries:', err);
    return [];
  }
}

export async function fetchDeliveriesForCourier(courierId: string) {
  try {
    await initDashboardDb();
    
    return await sql`
      SELECT * FROM deliveries 
      WHERE courier_id = ${courierId} OR status = 'Tersedia' 
      ORDER BY created_at DESC
    `;
  } catch (err) {
    console.error('Error fetching courier deliveries:', err);
    return [];
  }
}

export async function fetchDeliveriesForCustomer(senderName: string) {
  try {
    await initDashboardDb();
    return await sql`
      SELECT * FROM deliveries 
      WHERE sender = ${senderName} OR sender_phone = ${senderName}
      ORDER BY created_at DESC
    `;
  } catch (err) {
    console.error('Error fetching customer deliveries:', err);
    return [];
  }
}


export async function updateDeliveryStatus(id: string, status: string, notes: string, courierId: string) {
  try {
    await initDashboardDb();

    
    const courier = await sql`SELECT * FROM users WHERE id = ${courierId}`;
    const courierName = courier[0]?.name || 'Kurir';
    const vehicleName = courier[0]?.vehicle_name || 'Mobil L300';
    const vehicleType = courier[0]?.vehicle_type || 'Darat';
    const vehiclePlate = courier[0]?.vehicle_plate || 'AB 9876 CD';
    const vehicleCapacity = courier[0]?.vehicle_capacity || '1200 kg';

    if (status === 'Sedang Dikirim') {
      await sql`
        UPDATE deliveries 
        SET status = ${status}, 
            notes = ${notes}, 
            courier_id = ${courierId},
            vehicle_name = ${vehicleName},
            vehicle_type = ${vehicleType},
            vehicle_plate = ${vehiclePlate},
            vehicle_capacity = ${vehicleCapacity},
            updated_at = NOW() 
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE deliveries 
        SET status = ${status}, 
            notes = ${notes}, 
            updated_at = NOW() 
        WHERE id = ${id}
      `;
    }

    
    await sql`
      INSERT INTO history_logs (delivery_id, status, notes)
      VALUES (${id}, ${status}, ${notes})
    `;

    revalidatePath('/kurir');
    revalidatePath('/pelanggan/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating status:', err);
    return { error: 'Gagal memperbarui status paket: ' + err.message };
  }
}


export async function updateDelivery(id: string, data: {
  customer: string;
  phone: string;
  address: string;
  item_name: string;
  weight: number;
  ship_service: string;
  price: number;
  status: string;
  notes: string;
  vehicle_name?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  vehicle_capacity?: string;
}) {
  try {
    await initDashboardDb();

    await sql`
      UPDATE deliveries 
      SET customer = ${data.customer},
          phone = ${data.phone},
          address = ${data.address},
          item_name = ${data.item_name},
          weight = ${data.weight},
          ship_service = ${data.ship_service},
          price = ${data.price},
          status = ${data.status},
          notes = ${data.notes},
          vehicle_name = ${data.vehicle_name || null},
          vehicle_type = ${data.vehicle_type || null},
          vehicle_plate = ${data.vehicle_plate || null},
          vehicle_capacity = ${data.vehicle_capacity || null},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    
    await sql`
      INSERT INTO history_logs (delivery_id, status, notes)
      VALUES (${id}, ${data.status}, ${data.notes || 'Rincian paket diperbarui'})
    `;

    revalidatePath('/kurir');
    revalidatePath('/pelanggan/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating delivery:', err);
    return { error: 'Gagal mengedit rincian paket: ' + err.message };
  }
}


export async function deleteDelivery(id: string) {
  try {
    await initDashboardDb();

    await sql`DELETE FROM deliveries WHERE id = ${id}`;

    revalidatePath('/kurir');
    revalidatePath('/pelanggan/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting delivery:', err);
    return { error: 'Gagal menghapus paket: ' + err.message };
  }
}


export async function searchDeliveries(query: string, courierId?: string) {
  try {
    await initDashboardDb();
    const searchVal = `%${query.toLowerCase().trim()}%`;
    
    if (courierId) {
      return await sql`
        SELECT * FROM deliveries 
        WHERE (courier_id = ${courierId} OR status = 'Tersedia') AND (
          LOWER(id) LIKE ${searchVal} OR
          LOWER(customer) LIKE ${searchVal} OR
          LOWER(sender) LIKE ${searchVal} OR
          LOWER(item_name) LIKE ${searchVal} OR
          LOWER(address) LIKE ${searchVal}
        )
        ORDER BY created_at DESC
      `;
    } else {
      return await sql`
        SELECT * FROM deliveries 
        WHERE 
          LOWER(id) LIKE ${searchVal} OR
          LOWER(customer) LIKE ${searchVal} OR
          LOWER(sender) LIKE ${searchVal} OR
          LOWER(item_name) LIKE ${searchVal} OR
          LOWER(address) LIKE ${searchVal}
        ORDER BY created_at DESC
      `;
    }
  } catch (err) {
    console.error('Error searching deliveries:', err);
    return [];
  }
}


export async function fetchTrackingDetails(resi: string) {
  try {
    await initDashboardDb();
    const cleanResi = resi.trim();
    
    const delivery = await sql`SELECT * FROM deliveries WHERE id = ${cleanResi}`;
    if (delivery.length === 0) {
      return null;
    }

    const logs = await sql`
      SELECT * FROM history_logs 
      WHERE delivery_id = ${cleanResi} 
      ORDER BY created_at DESC, id DESC
    `;

    return {
      delivery: delivery[0],
      logs: logs
    };
  } catch (err) {
    console.error('Error fetching tracking info:', err);
    return null;
  }
}


export async function fetchUserAddresses(userId: string) {
  try {
    await initDashboardDb();
    return await sql`SELECT * FROM addresses WHERE user_id = ${userId} ORDER BY created_at ASC`;
  } catch (err) {
    console.error('Error fetching user addresses:', err);
    return [];
  }
}

export async function addUserAddress(userId: string, data: {
  label: string;
  contact: string;
  phone: string;
  details: string;
}) {
  try {
    await initDashboardDb();
    await sql`
      INSERT INTO addresses (user_id, label, contact, phone, details)
      VALUES (${userId}, ${data.label}, ${data.contact}, ${data.phone}, ${data.details})
    `;
    revalidatePath('/pelanggan/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error adding address:', err);
    return { error: err.message };
  }
}


export async function updateUserProfile(userId: string, data: {
  name: string;
  email: string;
  phone: string;
  address: string;
}) {
  try {
    await initDashboardDb();
    await sql`
      UPDATE users 
      SET name = ${data.name},
          email = ${data.email},
          phone = ${data.phone}
      WHERE id = ${userId}
    `;

    
    const addresses = await sql`SELECT id FROM addresses WHERE user_id = ${userId} AND label LIKE '%Utama%'`;
    if (addresses.length > 0) {
      await sql`
        UPDATE addresses 
        SET details = ${data.address},
            contact = ${data.name},
            phone = ${data.phone}
        WHERE id = ${addresses[0].id}
      `;
    } else {
      await sql`
        INSERT INTO addresses (user_id, label, contact, phone, details)
        VALUES (${userId}, 'Rumah (Utama)', ${data.name}, ${data.phone}, ${data.address})
      `;
    }

    revalidatePath('/pelanggan/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return { error: err.message };
  }
}

export async function fetchUserData(userId: string) {
  try {
    await initDashboardDb();
    const res = await sql`SELECT * FROM users WHERE id = ${userId}`;
    return res[0] || null;
  } catch (err) {
    console.error('Error fetching user details:', err);
    return null;
  }
}
