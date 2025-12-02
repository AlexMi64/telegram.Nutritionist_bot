'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'pending_confirmation_analysis', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'pending_confirmation_message_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'pending_confirmation_analysis');
    await queryInterface.removeColumn('users', 'pending_confirmation_message_id');
  }
};
