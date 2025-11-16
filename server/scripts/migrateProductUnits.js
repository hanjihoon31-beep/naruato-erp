/* eslint-env node */
/**
 * 제품 단위 시스템 마이그레이션 스크립트
 *
 * 기존 Product 문서의 unit 필드를 baseUnit으로 마이그레이션하고
 * 테스트 데이터 생성
 *
 * 실행 방법:
 * node server/scripts/migrateProductUnits.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// 테스트 제품 데이터
const testProducts = [
  {
    productName: '롱스틱',
    productCode: 'LONG-STICK-001',
    category: '식재료',
    baseUnit: 'EA',
    units: [
      { unit: 'EA', parentUnit: null, ratio: 1, description: '개별' },
      { unit: 'BAG', parentUnit: 'EA', ratio: 100, description: '봉지 (100개)' },
      { unit: 'BOX', parentUnit: 'BAG', ratio: 30, description: '박스 (30봉지)' }
    ],
    allowDecimal: false, // 개수 단위이므로 소수점 불허
    description: '1 BOX = 30 BAG = 3,000 EA'
  },
  {
    productName: '설탕',
    productCode: 'SUGAR-001',
    category: '식재료',
    baseUnit: 'G',
    units: [
      { unit: 'G', parentUnit: null, ratio: 1, description: '그램' },
      { unit: 'KG', parentUnit: 'G', ratio: 1000, description: '킬로그램 (1000g)' },
      { unit: 'BOX', parentUnit: 'KG', ratio: 5, description: '박스 (5kg)' }
    ],
    allowDecimal: true, // 무게 단위이므로 소수점 허용
    description: '1 BOX = 5 KG = 5,000 G'
  },
  {
    productName: '우유',
    productCode: 'MILK-001',
    category: '유제품',
    baseUnit: 'ML',
    units: [
      { unit: 'ML', parentUnit: null, ratio: 1, description: '밀리리터' },
      { unit: 'L', parentUnit: 'ML', ratio: 1000, description: '리터 (1000ml)' },
      { unit: 'BOX', parentUnit: 'L', ratio: 12, description: '박스 (12L)' }
    ],
    allowDecimal: true,
    description: '1 BOX = 12 L = 12,000 ML'
  },
  {
    productName: '감자',
    productCode: 'POTATO-001',
    category: '채소',
    baseUnit: 'KG',
    units: [
      { unit: 'KG', parentUnit: null, ratio: 1, description: '킬로그램' },
      { unit: 'BOX', parentUnit: 'KG', ratio: 20, description: '박스 (20kg)' }
    ],
    allowDecimal: true,
    description: '1 BOX = 20 KG'
  },
  {
    productName: '종이컵',
    productCode: 'CUP-001',
    category: '소모품',
    baseUnit: 'EA',
    units: [
      { unit: 'EA', parentUnit: null, ratio: 1, description: '개' },
      { unit: 'PACK', parentUnit: 'EA', ratio: 50, description: '팩 (50개)' },
      { unit: 'BOX', parentUnit: 'PACK', ratio: 20, description: '박스 (20팩)' }
    ],
    allowDecimal: false,
    description: '1 BOX = 20 PACK = 1,000 EA'
  }
];

async function migrate() {
  try {
    // MongoDB 연결
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/erp';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 연결 성공');

    // 1. 기존 제품 마이그레이션
    console.log('\n📦 기존 제품 마이그레이션 시작...');
    const existingProducts = await Product.find({
      $or: [
        { baseUnit: { $exists: false } },
        { units: { $exists: false } }
      ]
    });

    let migratedCount = 0;
    for (const product of existingProducts) {
      const oldUnit = product.unit || 'EA';

      product.baseUnit = oldUnit;
      product.units = [
        { unit: oldUnit, parentUnit: null, ratio: 1 }
      ];
      product.allowDecimal = true; // 기본값

      await product.save();
      migratedCount++;
      console.log(`  ✓ ${product.productName}: unit="${oldUnit}" → baseUnit="${oldUnit}"`);
    }

    console.log(`✅ ${migratedCount}개 제품 마이그레이션 완료`);

    // 2. 테스트 제품 생성
    console.log('\n📝 테스트 제품 생성 중...');
    for (const testData of testProducts) {
      const existing = await Product.findOne({ productCode: testData.productCode });

      if (existing) {
        console.log(`  ⏭️  ${testData.productName} (이미 존재)`);
        continue;
      }

      const product = await Product.create(testData);
      console.log(`  ✅ ${product.productName} 생성 완료`);
      console.log(`     baseUnit: ${product.baseUnit}`);
      console.log(`     units: ${product.units.length}개`);
      product.units.forEach(u => {
        console.log(`       - ${u.unit}: ${u.description}`);
      });
    }

    console.log('\n🎉 마이그레이션 완료!');

    // 3. 검증
    console.log('\n🔍 결과 검증...');
    const allProducts = await Product.find();
    const withUnits = allProducts.filter(p => p.units && p.units.length > 0);
    const withBaseUnit = allProducts.filter(p => p.baseUnit);

    console.log(`  전체 제품: ${allProducts.length}개`);
    console.log(`  baseUnit 있음: ${withBaseUnit.length}개`);
    console.log(`  units 배열 있음: ${withUnits.length}개`);

    if (withBaseUnit.length === allProducts.length && withUnits.length === allProducts.length) {
      console.log('✅ 모든 제품이 올바르게 마이그레이션됨');
    } else {
      console.log('⚠️  일부 제품이 마이그레이션되지 않음');
    }

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 MongoDB 연결 종료');
  }
}

// 스크립트 실행
if (require.main === module) {
  migrate().then(() => {
    console.log('\n✅ 스크립트 완료');
    process.exit(0);
  }).catch((err) => {
    console.error('\n❌ 스크립트 오류:', err);
    process.exit(1);
  });
}

module.exports = { migrate, testProducts };
