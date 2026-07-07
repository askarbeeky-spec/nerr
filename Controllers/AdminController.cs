using Microsoft.AspNetCore.Mvc;
using DoctorSystem.Data;
using DoctorSystem.Models;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace DoctorSystem.Controllers
{
    public class AdminController : Controller
    {
        private readonly DbHelper _dbHelper;
        private readonly IWebHostEnvironment _env;

        public AdminController(DbHelper dbHelper, IWebHostEnvironment env)
        {
            _dbHelper = dbHelper;
            _env = env;
        }

        public IActionResult Index()
        {
            var doctors = _dbHelper.GetAllDoctors();
            ViewBag.Stats = _dbHelper.GetStatistics();
            return View(doctors);
        }

        public IActionResult Create()
        {
            return View();
        }

        [HttpPost]
        public IActionResult Create(Doctor doctor)
        {
            if (ModelState.IsValid)
            {
                _dbHelper.AddDoctor(doctor);
                return RedirectToAction("Index");
            }
            return View(doctor);
        }

        public IActionResult Edit(int id)
        {
            var doctor = _dbHelper.GetDoctor(id);
            if (doctor == null) return NotFound();
            return View(doctor);
        }

        [HttpPost]
        public IActionResult Edit(Doctor doctor)
        {
            if (ModelState.IsValid)
            {
                _dbHelper.UpdateDoctor(doctor);
                return RedirectToAction("Index");
            }
            return View(doctor);
        }

        public IActionResult Delete(int id)
        {
            _dbHelper.DeleteDoctor(id);
            return RedirectToAction("Index");
        }

        public IActionResult ExportXml()
        {
            var path = Path.Combine(_env.WebRootPath, "doctors_export.xml");
            _dbHelper.ExportToXml(path);
            
            var fileBytes = System.IO.File.ReadAllBytes(path);
            return File(fileBytes, "application/xml", "doctors_export.xml");
        }

        [HttpPost]
        public IActionResult ImportXml(IFormFile xmlFile)
        {
            if (xmlFile != null && xmlFile.Length > 0)
            {
                var dict = Path.Combine(_env.WebRootPath, "temp");
                if (!Directory.Exists(dict)) Directory.CreateDirectory(dict);
                
                var path = Path.Combine(dict, "doctors_import.xml");
                using (var stream = new FileStream(path, FileMode.Create))
                {
                    xmlFile.CopyTo(stream);
                }
                
                _dbHelper.ImportFromXml(path);
                System.IO.File.Delete(path);
            }
            return RedirectToAction("Index");
        }
    }
}
