using System;
using System.Drawing;
using System.Windows.Forms;
using CarSystem.Shared;
using System.Linq;
using System.Collections.Generic;

namespace CarSystem.Desktop
{
    public partial class Form1 : Form
    {
        private TabControl tabControl;
        private TabPage tabClient;
        private TabPage tabAdmin;
        private DataGridView gridClient;
        private DataGridView gridAdmin;
        
        // Client Controls
        private TextBox txtSearch;
        private Button btnSearch;
        private Button btnBuy;
        
        // Admin Controls
        private TextBox txtBrand, txtModel, txtYear, txtEngineType, txtPrice, txtStock;
        private Button btnAdd, btnUpdate, btnDelete;
        
        // Admin Statistics
        private Label lblStatTotalCars, lblStatTotalStock, lblStatTotalValue;
        
        private DatabaseHelper db;
        private List<Car> _allCars;
        
        public Form1()
        {
            InitializeComponent();
            string dbPath = System.IO.Path.Combine(System.IO.Directory.GetParent(AppDomain.CurrentDomain.BaseDirectory).Parent.Parent.Parent.Parent.FullName, "cars.db");
            db = new DatabaseHelper(dbPath);
            LoadData();
        }
        
        private void InitializeComponent()
        {
            this.Text = "Система учёта автомобилей";
            this.Size = new Size(1000, 600);
            
            tabControl = new TabControl { Dock = DockStyle.Fill };
            tabClient = new TabPage("Клиент (Покупки)");
            tabAdmin = new TabPage("Админ (Управление)");
            
            // --- CLIENT TAB SETUP ---
            var pnlClientTop = new Panel { Dock = DockStyle.Top, Height = 60 };
            txtSearch = new TextBox { Location = new Point(10, 18), Width = 200 };
            btnSearch = new Button { Text = "Поиск", Location = new Point(220, 15), Height = 30, Width = 100 };
            btnSearch.Click += (s, e) => FilterClientData();
            btnBuy = new Button { Text = "Оформить покупку", Location = new Point(330, 15), Height = 30, Width = 150 };
            btnBuy.Click += BtnBuy_Click;
            pnlClientTop.Controls.Add(txtSearch);
            pnlClientTop.Controls.Add(btnSearch);
            pnlClientTop.Controls.Add(btnBuy);
            
            gridClient = new DataGridView { Dock = DockStyle.Fill, ReadOnly = true, SelectionMode = DataGridViewSelectionMode.FullRowSelect };
            
            tabClient.Controls.Add(gridClient);
            tabClient.Controls.Add(pnlClientTop);
            
            // --- ADMIN TAB SETUP ---
            var pnlAdminRight = new Panel { Dock = DockStyle.Right, Width = 300, Padding = new Padding(10) };
            int y = 20;
            pnlAdminRight.Controls.Add(CreateLabel("Марка:", y)); txtBrand = CreateTextBox(y); pnlAdminRight.Controls.Add(txtBrand); y += 30;
            pnlAdminRight.Controls.Add(CreateLabel("Модель:", y)); txtModel = CreateTextBox(y); pnlAdminRight.Controls.Add(txtModel); y += 30;
            pnlAdminRight.Controls.Add(CreateLabel("Год:", y)); txtYear = CreateTextBox(y); pnlAdminRight.Controls.Add(txtYear); y += 30;
            pnlAdminRight.Controls.Add(CreateLabel("Тип двигателя:", y)); txtEngineType = CreateTextBox(y); pnlAdminRight.Controls.Add(txtEngineType); y += 30;
            pnlAdminRight.Controls.Add(CreateLabel("Цена:", y)); txtPrice = CreateTextBox(y); pnlAdminRight.Controls.Add(txtPrice); y += 30;
            pnlAdminRight.Controls.Add(CreateLabel("В наличии:", y)); txtStock = CreateTextBox(y); pnlAdminRight.Controls.Add(txtStock); y += 40;
            
            btnAdd = new Button { Text = "Добавить", Location = new Point(10, y), Height = 35, Width = 85 };
            btnAdd.Click += BtnAdd_Click;
            btnUpdate = new Button { Text = "Изменить", Location = new Point(100, y), Height = 35, Width = 85 };
            btnUpdate.Click += BtnUpdate_Click;
            btnDelete = new Button { Text = "Удалить", Location = new Point(190, y), Height = 35, Width = 85 };
            btnDelete.Click += BtnDelete_Click;
            pnlAdminRight.Controls.Add(btnAdd);
            pnlAdminRight.Controls.Add(btnUpdate);
            pnlAdminRight.Controls.Add(btnDelete);
            
            gridAdmin = new DataGridView { Dock = DockStyle.Fill, SelectionMode = DataGridViewSelectionMode.FullRowSelect };
            gridAdmin.SelectionChanged += GridAdmin_SelectionChanged;
            
            // --- ADMIN STATS BOTTOM PANEL ---
            var pnlAdminBottom = new Panel { Dock = DockStyle.Bottom, Height = 40, Padding = new Padding(10), BackColor = Color.LightGray };
            lblStatTotalCars = new Label { Location = new Point(10, 10), Width = 150, Font = new Font(this.Font, FontStyle.Bold) };
            lblStatTotalStock = new Label { Location = new Point(200, 10), Width = 200, Font = new Font(this.Font, FontStyle.Bold) };
            lblStatTotalValue = new Label { Location = new Point(450, 10), Width = 250, Font = new Font(this.Font, FontStyle.Bold) };
            pnlAdminBottom.Controls.Add(lblStatTotalCars);
            pnlAdminBottom.Controls.Add(lblStatTotalStock);
            pnlAdminBottom.Controls.Add(lblStatTotalValue);

            tabAdmin.Controls.Add(gridAdmin);
            tabAdmin.Controls.Add(pnlAdminRight);
            tabAdmin.Controls.Add(pnlAdminBottom);
            
            tabControl.TabPages.Add(tabClient);
            tabControl.TabPages.Add(tabAdmin);
            
            this.Controls.Add(tabControl);
        }

        private Label CreateLabel(string text, int y) => new Label { Text = text, Location = new Point(10, y), Width = 100 };
        private TextBox CreateTextBox(int y) => new TextBox { Location = new Point(110, y), Width = 150 };

        private void LoadData()
        {
            _allCars = db.GetAllCars();
            gridClient.DataSource = null;
            gridClient.DataSource = _allCars.Where(c => c.StockVolume > 0).ToList();
            
            gridAdmin.DataSource = null;
            gridAdmin.DataSource = _allCars;

            UpdateStatistics();
        }

        private void UpdateStatistics()
        {
            if (_allCars == null) return;
            lblStatTotalCars.Text = $"Уникальных авто: {_allCars.Count}";
            lblStatTotalStock.Text = $"Суммарно на складе: {_allCars.Sum(c => c.StockVolume)} шт.";
            lblStatTotalValue.Text = $"Общая стоимость: ${_allCars.Sum(c => c.StockVolume * c.Price):N0}";
        }

        private void FilterClientData()
        {
            var query = txtSearch.Text.ToLower();
            gridClient.DataSource = _allCars.Where(c => c.StockVolume > 0 && 
                (c.Brand.ToLower().Contains(query) || c.Model.ToLower().Contains(query))).ToList();
        }

        private void BtnBuy_Click(object sender, EventArgs e)
        {
            if (gridClient.SelectedRows.Count > 0)
            {
                var carId = (int)gridClient.SelectedRows[0].Cells["Id"].Value;
                var car = _allCars.First(c => c.Id == carId);
                car.StockVolume--;
                db.UpdateCar(car);
                MessageBox.Show("Покупка успешно оформлена!", "Успех", MessageBoxButtons.OK, MessageBoxIcon.Information);
                LoadData();
            }
        }

        private void GridAdmin_SelectionChanged(object sender, EventArgs e)
        {
            if (gridAdmin.SelectedRows.Count > 0)
            {
                var row = gridAdmin.SelectedRows[0];
                txtBrand.Text = row.Cells["Brand"].Value?.ToString();
                txtModel.Text = row.Cells["Model"].Value?.ToString();
                txtYear.Text = row.Cells["Year"].Value?.ToString();
                txtEngineType.Text = row.Cells["EngineType"].Value?.ToString();
                txtPrice.Text = row.Cells["Price"].Value?.ToString();
                txtStock.Text = row.Cells["StockVolume"].Value?.ToString();
            }
        }

        private void BtnAdd_Click(object sender, EventArgs e)
        {
            var car = new Car
            {
                Brand = txtBrand.Text,
                Model = txtModel.Text,
                Year = int.Parse(txtYear.Text),
                EngineType = txtEngineType.Text,
                Price = decimal.Parse(txtPrice.Text),
                StockVolume = int.Parse(txtStock.Text)
            };
            db.AddCar(car);
            LoadData();
        }

        private void BtnUpdate_Click(object sender, EventArgs e)
        {
            if (gridAdmin.SelectedRows.Count > 0)
            {
                var carId = (int)gridAdmin.SelectedRows[0].Cells["Id"].Value;
                var car = new Car
                {
                    Id = carId,
                    Brand = txtBrand.Text,
                    Model = txtModel.Text,
                    Year = int.Parse(txtYear.Text),
                    EngineType = txtEngineType.Text,
                    Price = decimal.Parse(txtPrice.Text),
                    StockVolume = int.Parse(txtStock.Text)
                };
                db.UpdateCar(car);
                LoadData();
            }
        }

        private void BtnDelete_Click(object sender, EventArgs e)
        {
            if (gridAdmin.SelectedRows.Count > 0)
            {
                var carId = (int)gridAdmin.SelectedRows[0].Cells["Id"].Value;
                db.DeleteCar(carId);
                LoadData();
            }
        }
    }
}
