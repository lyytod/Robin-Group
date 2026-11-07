import { prisma } from '../config/database.js';
import { StockMovementType, Prisma } from '@prisma/client';
import { calculateTotalPages } from '../utils/helpers.js';

export interface CreateProductInput {
  code: string;
  name: string;
  category?: string;
  unit?: string;
  sellingPrice: number | string;
  purchasePrice?: number | string;
  currentStock?: number | string;
  minimumStock?: number | string;
  description?: string;
}

export interface UpdateProductInput {
  code?: string;
  name?: string;
  category?: string;
  unit?: string;
  sellingPrice?: number | string;
  purchasePrice?: number | string;
  minimumStock?: number | string;
  description?: string;
  isActive?: boolean;
}

export interface AdjustStockInput {
  type: StockMovementType;
  quantity: number | string;
  reference?: string;
  notes?: string;
}

export class ProductService {
  /**
   * Mengambil daftar produk per unit usaha dengan filter & pagination
   */
  static async getAll(params: {
    businessId: number;
    category?: string;
    search?: string;
    lowStockOnly?: boolean;
    page: number;
    limit: number;
    skip: number;
  }) {
    const where: any = {
      businessId: params.businessId,
      deletedAt: null,
    };

    if (params.category && params.category !== 'ALL') {
      where.category = params.category;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { code: { contains: params.search } },
        { category: { contains: params.search } },
      ];
    }

    if (params.lowStockOnly) {
      // Prisma filter untuk stok menipis
      where.currentStock = {
        lte: prisma.product.fields.minimumStock,
      };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    const formattedProducts = products.map((p) => {
      const current = Number(p.currentStock);
      const min = Number(p.minimumStock);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        unit: p.unit,
        sellingPrice: Number(p.sellingPrice),
        purchasePrice: Number(p.purchasePrice),
        currentStock: current,
        minimumStock: min,
        isLowStock: current <= min,
        isActive: p.isActive,
        description: p.description,
        createdAt: p.createdAt,
      };
    });

    return {
      products: formattedProducts,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: calculateTotalPages(total, params.limit),
      },
    };
  }

  /**
   * Mengambil daftar kategori / tipe menu yang sudah ada
   */
  static async getCategories(businessId: number) {
    const products = await prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        category: { not: null },
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return products
      .map((p) => p.category?.trim())
      .filter((cat): cat is string => Boolean(cat && cat.length > 0));
  }

  /**
   * Mengambil detail satu produk
   */
  static async getById(id: number, businessId: number) {
    const product = await prisma.product.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new Error('Produk tidak ditemukan.');
    }

    const current = Number(product.currentStock);
    const min = Number(product.minimumStock);

    return {
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      unit: product.unit,
      sellingPrice: Number(product.sellingPrice),
      purchasePrice: Number(product.purchasePrice),
      currentStock: current,
      minimumStock: min,
      isLowStock: current <= min,
      isActive: product.isActive,
      description: product.description,
      createdAt: product.createdAt,
      recentMovements: product.stockMovements.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: Number(m.quantity),
        stockBefore: Number(m.stockBefore),
        stockAfter: Number(m.stockAfter),
        reference: m.reference,
        notes: m.notes,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Membuat produk baru dan mencatat pergerakan stok awal jika ada
   */
  static async create(businessId: number, data: CreateProductInput) {
    if (!data.code || !data.name || data.sellingPrice === undefined) {
      throw new Error('Kode produk, nama produk, dan harga jual wajib diisi.');
    }

    const cleanCode = data.code.trim();

    // Cek duplikasi kode pada unit usaha yang sama
    const existing = await prisma.product.findFirst({
      where: { businessId, code: cleanCode, deletedAt: null },
    });

    if (existing) {
      throw new Error(`Produk dengan kode "${cleanCode}" sudah terdaftar.`);
    }

    const initialStock = new Prisma.Decimal(data.currentStock ?? 0);
    const minStock = new Prisma.Decimal(data.minimumStock ?? 0);
    const sellPrice = new Prisma.Decimal(data.sellingPrice);
    const buyPrice = new Prisma.Decimal(data.purchasePrice ?? 0);

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          businessId,
          code: cleanCode,
          name: data.name.trim(),
          category: data.category?.trim() || null,
          unit: data.unit?.trim() || 'PCS',
          sellingPrice: sellPrice,
          purchasePrice: buyPrice,
          currentStock: initialStock,
          minimumStock: minStock,
          description: data.description?.trim() || null,
          isActive: true,
        },
      });

      // Jika ada stok awal, catat di stock_movements
      if (initialStock.greaterThan(0)) {
        await tx.stockMovement.create({
          data: {
            businessId,
            productId: product.id,
            type: StockMovementType.MASUK,
            quantity: initialStock,
            stockBefore: new Prisma.Decimal(0),
            stockAfter: initialStock,
            reference: 'STOK-AWAL',
            notes: 'Pencatatan stok awal saat produk baru didaftarkan',
          },
        });
      }

      return {
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category,
        unit: product.unit,
        sellingPrice: Number(product.sellingPrice),
        purchasePrice: Number(product.purchasePrice),
        currentStock: Number(product.currentStock),
        minimumStock: Number(product.minimumStock),
      };
    });
  }

  /**
   * Memperbarui informasi produk
   */
  static async update(id: number, businessId: number, data: UpdateProductInput) {
    const product = await prisma.product.findFirst({
      where: { id, businessId, deletedAt: null },
    });

    if (!product) {
      throw new Error('Produk tidak ditemukan.');
    }

    if (data.code) {
      const cleanCode = data.code.trim();
      const existing = await prisma.product.findFirst({
        where: {
          businessId,
          code: cleanCode,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (existing) {
        throw new Error(`Kode produk "${cleanCode}" sudah digunakan produk lain.`);
      }
      data.code = cleanCode;
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.code) updateData.code = data.code;
    if (data.category !== undefined) updateData.category = data.category?.trim() || null;
    if (data.unit) updateData.unit = data.unit.trim();
    if (data.sellingPrice !== undefined) updateData.sellingPrice = new Prisma.Decimal(data.sellingPrice);
    if (data.purchasePrice !== undefined) updateData.purchasePrice = new Prisma.Decimal(data.purchasePrice);
    if (data.minimumStock !== undefined) updateData.minimumStock = new Prisma.Decimal(data.minimumStock);
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      category: updated.category,
      unit: updated.unit,
      sellingPrice: Number(updated.sellingPrice),
      purchasePrice: Number(updated.purchasePrice),
      currentStock: Number(updated.currentStock),
      minimumStock: Number(updated.minimumStock),
      isActive: updated.isActive,
    };
  }

  /**
   * Penyesuaian stok manual (Stok Masuk, Stok Keluar, Stock Opname, Retur)
   */
  static async adjustStock(id: number, businessId: number, input: AdjustStockInput) {
    const qty = new Prisma.Decimal(input.quantity);
    if (qty.lessThanOrEqualTo(0)) {
      throw new Error('Jumlah penyesuaian stok harus lebih besar dari 0.');
    }

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id, businessId, deletedAt: null },
      });

      if (!product) {
        throw new Error('Produk tidak ditemukan.');
      }

      const stockBefore = product.currentStock;
      let stockAfter: Prisma.Decimal;

      switch (input.type) {
        case StockMovementType.MASUK:
        case StockMovementType.RETUR:
          stockAfter = stockBefore.plus(qty);
          break;
        case StockMovementType.KELUAR:
          if (stockBefore.lessThan(qty)) {
            throw new Error(`Stok saat ini (${stockBefore}) tidak mencukupi untuk pengurangan ${qty}.`);
          }
          stockAfter = stockBefore.minus(qty);
          break;
        case StockMovementType.OPNAME:
          // Pada opname, qty adalah stok fisik hasil hitungan riil
          stockAfter = qty;
          break;
        default:
          throw new Error('Tipe pergerakan stok tidak valid.');
      }

      // Update stok di tabel products
      await tx.product.update({
        where: { id },
        data: { currentStock: stockAfter },
      });

      // Catat di riwayat stock_movements
      const movement = await tx.stockMovement.create({
        data: {
          businessId,
          productId: id,
          type: input.type,
          quantity: input.type === StockMovementType.OPNAME ? stockAfter.minus(stockBefore).abs() : qty,
          stockBefore,
          stockAfter,
          reference: input.reference?.trim() || null,
          notes: input.notes?.trim() || null,
        },
      });

      return {
        productId: id,
        productName: product.name,
        stockBefore: Number(stockBefore),
        stockAfter: Number(stockAfter),
        movement: {
          id: movement.id,
          type: movement.type,
          quantity: Number(movement.quantity),
          createdAt: movement.createdAt,
        },
      };
    });
  }

  /**
   * Hapus produk (Soft Delete)
   */
  static async softDelete(id: number, businessId: number) {
    const product = await prisma.product.findFirst({
      where: { id, businessId, deletedAt: null },
    });

    if (!product) {
      throw new Error('Produk tidak ditemukan.');
    }

    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { id, message: 'Produk berhasil dinonaktifkan (soft delete).' };
  }

  /**
   * Riwayat pergerakan stok
   */
  static async getMovements(params: {
    businessId: number;
    productId?: number;
    page: number;
    limit: number;
    skip: number;
  }) {
    const where: any = {
      businessId: params.businessId,
    };
    if (params.productId) {
      where.productId = params.productId;
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { id: true, code: true, name: true, unit: true },
          },
        },
      }),
    ]);

    return {
      movements: movements.map((m) => ({
        id: m.id,
        productId: m.productId,
        productName: m.product.name,
        productCode: m.product.code,
        unit: m.product.unit,
        type: m.type,
        quantity: Number(m.quantity),
        stockBefore: Number(m.stockBefore),
        stockAfter: Number(m.stockAfter),
        reference: m.reference,
        notes: m.notes,
        createdAt: m.createdAt,
      })),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: calculateTotalPages(total, params.limit),
      },
    };
  }
}
