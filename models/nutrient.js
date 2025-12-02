module.exports = (sequelize, DataTypes) => {
  const Nutrient = sequelize.define('Nutrient', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fdcNutrientId: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: false
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      index: true
    },
    unitName: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    nutrientNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true
    },
    rank: {
      type: DataTypes.DECIMAL(10, 1),
      allowNull: true
    }
  }, {
    tableName: 'nutrients',
    indexes: [
      {
        fields: ['nutrientNumber'],
        using: 'BTREE'
      },
      {
        fields: ['rank'],
        using: 'BTREE'
      }
    ]
  });

  Nutrient.associate = (models) => {
    Nutrient.hasMany(models.FoodNutrient, {
      foreignKey: 'nutrientId',
      as: 'foodNutrients',
      onDelete: 'CASCADE'
    });
  };

  return Nutrient;
};
