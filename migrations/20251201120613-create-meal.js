'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meals', {
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
          model: 'users',
          key: 'id'
        },
        field: 'user_id'
      },
      date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      meal_type: {
        type: Sequelize.ENUM('breakfast', 'lunch', 'dinner', 'snack'),
        allowNull: false,
        defaultValue: 'snack',
        field: 'meal_type'
      },
      calories: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      protein: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      fat: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      carbs: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      photo_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'photo_path'
      },
      audio_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'audio_path'
      },
      ai_analysis: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'ai_analysis'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'created_at'
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updated_at'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('meals');
  }
};
