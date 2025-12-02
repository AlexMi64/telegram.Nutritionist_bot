'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserRecipe = sequelize.define('UserRecipe', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  recipe_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Recipes',
      key: 'id'
    }
  },
  is_favorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true, // 1-5 stars
    validate: {
      min: 1,
      max: 5
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true // User notes about the recipe
  },
  cooked_at: {
    type: DataTypes.DATE,
    allowNull: true // When user last cooked this recipe
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_recipes',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'recipe_id']
    },
    {
      fields: ['user_id', 'is_favorite']
    }
  ]
});

  UserRecipe.associate = (models) => {
    UserRecipe.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    UserRecipe.belongsTo(models.Recipe, {
      foreignKey: 'recipe_id',
      as: 'recipe'
    });
  };

  return UserRecipe;
};
