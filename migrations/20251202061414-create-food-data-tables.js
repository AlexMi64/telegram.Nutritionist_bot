'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create nutrients table
    await queryInterface.createTable('nutrients', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      fdcNutrientId: {
        type: Sequelize.INTEGER,
        unique: true,
        allowNull: false
      },
      name: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      unitName: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      nutrientNumber: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      rank: {
        type: Sequelize.DECIMAL(10, 1),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create food_data table
    await queryInterface.createTable('food_data', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      fdcId: {
        type: Sequelize.INTEGER,
        unique: true,
        allowNull: false
      },
      dataType: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      descriptionLower: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      foodCategoryId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      publicationDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create food_nutrients table
    await queryInterface.createTable('food_nutrients', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      foodDataId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'food_data',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      nutrientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'nutrients',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      derivationId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      min: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      max: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      units: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'G'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('nutrients', ['nutrientNumber']);
    await queryInterface.addIndex('nutrients', ['rank']);
    await queryInterface.addIndex('food_data', ['descriptionLower']);
    await queryInterface.addIndex('food_data', ['dataType', 'foodCategoryId']);
    await queryInterface.addIndex('food_nutrients', ['foodDataId']);
    await queryInterface.addIndex('food_nutrients', ['nutrientId']);
    await queryInterface.addIndex('food_nutrients', ['foodDataId', 'nutrientId'], { unique: true });
  },

  async down (queryInterface, Sequelize) {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable('food_nutrients');
    await queryInterface.dropTable('food_data');
    await queryInterface.dropTable('nutrients');
  }
};
