using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Data.Sqlite;
using DoctorSystem.Models;

namespace DoctorSystem.Data
{
    public class DbHelper
    {
        private readonly string _connectionString;

        public DbHelper(string connectionString)
        {
            _connectionString = connectionString;
        }

        public void InitializeDb()
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();

            var tableCmd = connection.CreateCommand();
            tableCmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS Doctors (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    LastName TEXT NOT NULL,
                    FirstName TEXT NOT NULL,
                    Specialty TEXT NOT NULL,
                    Experience INTEGER NOT NULL,
                    Department TEXT NOT NULL,
                    PatientsCount INTEGER NOT NULL,
                    Schedule TEXT NOT NULL,
                    Salary DECIMAL NOT NULL
                )";
            tableCmd.ExecuteNonQuery();

            var countCmd = connection.CreateCommand();
            countCmd.CommandText = "SELECT COUNT(*) FROM Doctors";
            var count = (long)countCmd.ExecuteScalar();

            if (count <= 3)
            {
                var seedCmd = connection.CreateCommand();
                seedCmd.CommandText = @"
                    DELETE FROM Doctors;
                    INSERT INTO Doctors (LastName, FirstName, Specialty, Experience, Department, PatientsCount, Schedule, Salary) VALUES 
                    ('Иванов', 'Иван', 'Хирург', 15, 'Хирургия', 1500, 'Пн, Ср, Пт (08:00 - 15:00)', 85000),
                    ('Смирнова', 'Елена', 'Педиатр', 8, 'Педиатрия', 2200, 'Ср-Вс (09:00 - 18:00)', 70000),
                    ('Кузнецов', 'Алексей', 'Кардиолог', 20, 'Кардиология', 3100, 'Пн-Пт (10:00 - 17:00)', 95000),
                    ('Попова', 'Мария', 'Невролог', 12, 'Неврология', 1800, 'Вт, Чт, Сб (09:00 - 14:00)', 80000),
                    ('Васильев', 'Петр', 'Офтальмолог', 5, 'Глазное', 1200, 'Пн-Пт (08:00 - 16:00)', 65000),
                    ('Соколова', 'Анна', 'Терапевт', 10, 'Общая терапия', 4500, 'Пн-Пт (08:00 - 20:00)', 75000),
                    ('Михайлов', 'Дмитрий', 'Ортопед', 14, 'Травматология', 1900, 'Пн, Вт, Пт (10:00 - 18:00)', 82000),
                    ('Федорова', 'Ольга', 'Дерматолог', 7, 'Кожвен', 1400, 'Ср, Чт, Пт (09:00 - 15:00)', 68000),
                    ('Морозов', 'Михаил', 'Анестезиолог', 18, 'Хирургия', 1300, 'Сутки через двое', 110000),
                    ('Волкова', 'Екатерина', 'Эндокринолог', 11, 'Терапия', 1600, 'Пн-Ср (08:00 - 14:00)', 78000);
                ";
                seedCmd.ExecuteNonQuery();
            }
        }

        public List<Doctor> GetAllDoctors()
        {
            var doctors = new List<Doctor>();
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();
            var command = connection.CreateCommand();
            command.CommandText = "SELECT * FROM Doctors";
            using var reader = command.ExecuteReader();
            while (reader.Read())
            {
                doctors.Add(MapReaderToDoctor(reader));
            }
            return doctors;
        }

        public Doctor GetDoctor(int id)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();
            var command = connection.CreateCommand();
            command.CommandText = "SELECT * FROM Doctors WHERE Id = @id";
            command.Parameters.AddWithValue("@id", id);
            using var reader = command.ExecuteReader();
            if (reader.Read()) return MapReaderToDoctor(reader);
            return null;
        }

        public void AddDoctor(Doctor doctor)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();
            var command = connection.CreateCommand();
            command.CommandText = "INSERT INTO Doctors (LastName, FirstName, Specialty, Experience, Department, PatientsCount, Schedule, Salary) VALUES (@lastName, @firstName, @specialty, @experience, @department, @patientsCount, @schedule, @salary)";
            AddParameters(command, doctor);
            command.ExecuteNonQuery();
        }

        public void UpdateDoctor(Doctor doctor)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();
            var command = connection.CreateCommand();
            command.CommandText = "UPDATE Doctors SET LastName = @lastName, FirstName = @firstName, Specialty = @specialty, Experience = @experience, Department = @department, PatientsCount = @patientsCount, Schedule = @schedule, Salary = @salary WHERE Id = @id";
            command.Parameters.AddWithValue("@id", doctor.Id);
            AddParameters(command, doctor);
            command.ExecuteNonQuery();
        }

        public void DeleteDoctor(int id)
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();
            var command = connection.CreateCommand();
            command.CommandText = "DELETE FROM Doctors WHERE Id = @id";
            command.Parameters.AddWithValue("@id", id);
            command.ExecuteNonQuery();
        }

        public List<Doctor> SearchDoctors(string query, string specialty)
        {
            var doctors = new List<Doctor>();
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();
            var command = connection.CreateCommand();
            string sql = "SELECT * FROM Doctors WHERE 1=1";
            
            if (!string.IsNullOrEmpty(query))
            {
                sql += " AND (LastName LIKE @q OR FirstName LIKE @q)";
                command.Parameters.AddWithValue("@q", $"%{query}%");
            }
            if (!string.IsNullOrEmpty(specialty))
            {
                sql += " AND Specialty = @spec";
                command.Parameters.AddWithValue("@spec", specialty);
            }

            command.CommandText = sql;
            using var reader = command.ExecuteReader();
            while (reader.Read())
            {
                doctors.Add(MapReaderToDoctor(reader));
            }
            return doctors;
        }

        public object GetStatistics()
        {
            using var connection = new SqliteConnection(_connectionString);
            connection.Open();
            var command = connection.CreateCommand();
            command.CommandText = "SELECT COUNT(*), SUM(PatientsCount), AVG(Salary), SUM(Salary), AVG(Experience) FROM Doctors";
            using var reader = command.ExecuteReader();
            if (reader.Read() && !reader.IsDBNull(0) && reader.GetInt32(0) > 0)
            {
                return new
                {
                    TotalDoctors = reader.GetInt32(0),
                    TotalPatients = reader.IsDBNull(1) ? 0 : reader.GetInt32(1),
                    AvgSalary = reader.IsDBNull(2) ? 0 : reader.GetDecimal(2),
                    TotalSalary = reader.IsDBNull(3) ? 0 : reader.GetDecimal(3),
                    AvgExperience = reader.IsDBNull(4) ? 0 : reader.GetDouble(4)
                };
            }
            return null;
        }

        public void ExportToXml(string filePath)
        {
            var doctors = GetAllDoctors();
            var doc = new System.Xml.Linq.XDocument(
                new System.Xml.Linq.XElement("Doctors",
                    from d in doctors
                    select new System.Xml.Linq.XElement("Doctor",
                        new System.Xml.Linq.XElement("Id", d.Id),
                        new System.Xml.Linq.XElement("LastName", d.LastName),
                        new System.Xml.Linq.XElement("FirstName", d.FirstName),
                        new System.Xml.Linq.XElement("Specialty", d.Specialty),
                        new System.Xml.Linq.XElement("Experience", d.Experience),
                        new System.Xml.Linq.XElement("Department", d.Department),
                        new System.Xml.Linq.XElement("PatientsCount", d.PatientsCount),
                        new System.Xml.Linq.XElement("Schedule", d.Schedule),
                        new System.Xml.Linq.XElement("Salary", d.Salary)
                    )
                )
            );
            doc.Save(filePath);
        }

        public void ImportFromXml(string filePath)
        {
            var doc = System.Xml.Linq.XDocument.Load(filePath);
            foreach (var el in doc.Descendants("Doctor"))
            {
                var d = new Doctor
                {
                    LastName = el.Element("LastName")?.Value,
                    FirstName = el.Element("FirstName")?.Value,
                    Specialty = el.Element("Specialty")?.Value,
                    Experience = int.Parse(el.Element("Experience")?.Value ?? "0"),
                    Department = el.Element("Department")?.Value,
                    PatientsCount = int.Parse(el.Element("PatientsCount")?.Value ?? "0"),
                    Schedule = el.Element("Schedule")?.Value,
                    Salary = decimal.Parse(el.Element("Salary")?.Value ?? "0")
                };
                AddDoctor(d);
            }
        }

        private Doctor MapReaderToDoctor(SqliteDataReader reader)
        {
            return new Doctor
            {
                Id = reader.GetInt32(0),
                LastName = reader.GetString(1),
                FirstName = reader.GetString(2),
                Specialty = reader.GetString(3),
                Experience = reader.GetInt32(4),
                Department = reader.GetString(5),
                PatientsCount = reader.GetInt32(6),
                Schedule = reader.GetString(7),
                Salary = reader.GetDecimal(8)
            };
        }

        private void AddParameters(SqliteCommand command, Doctor doctor)
        {
            command.Parameters.AddWithValue("@lastName", doctor.LastName ?? "");
            command.Parameters.AddWithValue("@firstName", doctor.FirstName ?? "");
            command.Parameters.AddWithValue("@specialty", doctor.Specialty ?? "");
            command.Parameters.AddWithValue("@experience", doctor.Experience);
            command.Parameters.AddWithValue("@department", doctor.Department ?? "");
            command.Parameters.AddWithValue("@patientsCount", doctor.PatientsCount);
            command.Parameters.AddWithValue("@schedule", doctor.Schedule ?? "");
            command.Parameters.AddWithValue("@salary", doctor.Salary);
        }
    }
}
