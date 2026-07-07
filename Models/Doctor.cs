using System.ComponentModel.DataAnnotations;

namespace DoctorSystem.Models
{
    public class Doctor
    {
        public int Id { get; set; }
        
        [Display(Name = "Фамилия")]
        public string LastName { get; set; }

        [Display(Name = "Имя")]
        public string FirstName { get; set; }

        [Display(Name = "Специальность")]
        public string Specialty { get; set; }

        [Display(Name = "Опыт (лет)")]
        public int Experience { get; set; }

        [Display(Name = "Отделение")]
        public string Department { get; set; }

        [Display(Name = "Количество пациентов")]
        public int PatientsCount { get; set; }

        [Display(Name = "График работы")]
        public string Schedule { get; set; }

        [Display(Name = "Зарплата")]
        public decimal Salary { get; set; }
    }
}
