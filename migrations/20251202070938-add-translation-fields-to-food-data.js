'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add translation fields to food_data table
    await queryInterface.addColumn('food_data', 'descriptionEn', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'English description (same as original from USDA)'
    });

    await queryInterface.addColumn('food_data', 'descriptionRu', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Russian description (Google Translate)'
    });

    // Add indexes for new fields
    await queryInterface.addIndex('food_data', ['descriptionEn']);
    await queryInterface.addIndex('food_data', ['descriptionRu']);
  },

  async down (queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('food_data', ['descriptionRu']);
    await queryInterface.removeIndex('food_data', ['descriptionEn']);

    // Remove columns
    await queryInterface.removeColumn('food_data', 'descriptionRu');
    await queryInterface.removeColumn('food_data', 'descriptionEn');
  }
};
