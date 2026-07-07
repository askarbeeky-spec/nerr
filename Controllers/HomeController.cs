using Microsoft.AspNetCore.Mvc;
using DoctorSystem.Data;
using DoctorSystem.Models;
using System.Diagnostics;
using System.Linq;

namespace DoctorSystem.Controllers
{
    public class HomeController : Controller
    {
        private readonly DbHelper _dbHelper;

        public HomeController(DbHelper dbHelper)
        {
            _dbHelper = dbHelper;
        }

        public IActionResult Index(string query, string specialty)
        {
            var doctors = _dbHelper.SearchDoctors(query, specialty);
            
            var allDoctors = _dbHelper.GetAllDoctors();
            ViewBag.Specialties = allDoctors.Select(d => d.Specialty).Distinct().ToList();
            ViewBag.Query = query;
            ViewBag.SelectedSpecialty = specialty;
            
            return View(doctors);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
