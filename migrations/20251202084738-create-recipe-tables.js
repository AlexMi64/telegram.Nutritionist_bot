'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Создание таблицы recipes
    await queryInterface.createTable('recipes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ingredients: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      nutrition_per_serving: {
        type: Sequelize.JSON,
        allowNull: false
      },
      difficulty_level: {
        type: Sequelize.ENUM,
        values: ['easy', 'medium', 'hard'],
        defaultValue: 'medium'
      },
      cooking_time: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      servings: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      tags: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      is_popular: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Индексы для таблицы recipes
    await queryInterface.addIndex('recipes', ['user_id']);
    await queryInterface.addIndex('recipes', ['is_popular']);
    await queryInterface.addIndex('recipes', ['tags'], {
      type: 'JSON'
    });

    // Создание таблицы user_recipes
    await queryInterface.createTable('user_recipes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      recipe_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Recipes',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      is_favorite: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cooked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Уникальный индекс для user_recipes
    await queryInterface.addIndex('user_recipes', ['user_id', 'recipe_id'], {
      unique: true
    });
    await queryInterface.addIndex('user_recipes', ['user_id', 'is_favorite']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('user_recipes');
    await queryInterface.dropTable('recipes');
  }
};
