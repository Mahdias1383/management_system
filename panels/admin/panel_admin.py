from user import User
from config.admin_information import ADMIN_USERNAME , ADMIN_PASSWORD
import panels.panel_start as start
#an empty dict for save values.
employee_dict = {}

class Admin_Panel(User):
    "This class have the admin panel's methods that we define them."
    def __init__(self, username = "username", password =123 , email ="quera@gmail.com", name = "name", lastname = "lastname"):
        super().__init__(username, password)
        self.email = email
        self.name = name
        self.lastname = lastname
  

    def admin_login(self):
        "This method defines login operation for admin and enter to the admin panel."
        
        #get inputs.
        while True:
            choice = input("Do you want to back to the Main Panel (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                start.display_start_panel()
                
            else:
                username = input("Enter your user name : ").lower()
                password = input("Enter your password : ") 
                
                if username == (ADMIN_USERNAME).lower() and password == ADMIN_PASSWORD:
                    print("You entered successfully!\n")
                    self.display_panel() 
                    
                else:
                    print("Your username or password was wrong.\nPlease try again!\n")
                    continue


    def add_employee(self): 
        "This method defines that admin can add employee to the system and employee's information."
        
        def get_back():
            "get back to main panel."
            
            choice = input("Do you want to get back (yes/no) ? : ")
            
            if choice.lower() == "yes":
                self.display_panel ()
            
            elif choice.lower() == "no":
                self.add_employee()
            
            else:
                print("Wrong choice! Please try again!\n")
                get_back() 
        
        while True:
            # get user input
            name = input("Enter name : ")
            lastname = input("Enter lastname : ")
            username = input("Enter username : ")
            email = input("Enter email : ")
            password = input("Enter password : ")

            #check if username already exist in employee dictionary .
            if any(username == user["username"] for user in employee_dict.values()):
                print("Username is already taken! Please enter a different one!\n")
                continue
            
            #check if email already exist in employee dictionary .
            if any(email == user.get("email") for user in employee_dict.values()):
                print("Email address already taken! Please enter a different one!\n")
                continue
            
            #check the values to be not empty .
            if name == "" or lastname == "" or username == "" or password == "" or email == "":
                print("Value of fields can not be empty !\n")
                continue
            
            #check if email format is valid .
            if "@" not in email:
                print("The email is not valid ! Please try again !\n")
                continue

            #store user inputs in a dictionary .
            user_dict = {"name" : name, "lastname" : lastname, "username" : username, "email" : email, "password" : password}

            #add user dictionary to users dictionary .
            employee_dict[username] = user_dict
            
            #ask user if they want to enter another set of inputs .
            choice = input("Do you want to enter another set of inputs (yes/no) ? : ")
            if choice.lower() == "no":
                break
            
        #print the last version of employee dictionary .
        print("You employee's information : ")
        for user in employee_dict.values():
            print(user)
        get_back() 


    def return_employee_dict(self):
        "This function just returns the employee dictionary."
        return employee_dict
        
    
    def remove_employee(self):
        "This method defines that admin can remove every employee."
        
        def get_back():
            "get back to main panel."
         
            choice = input("Do you want to get back (yes/no) ? : ")
         
            if choice.lower() == "yes":
                self.display_panel()
         
            elif choice.lower() == "no":
                self.remove_employee()
         
            else:
                print("Wrong choice! Please try again!\n")
                get_back()
        
       
        while True:
            # get username input from user .
            username = input("Enter the username to delete it type 'quit' to exit: ")

            # exit the loop if user types 'quit' .
            if username == "quit":
                self.display_panel()
                break
            
            elif len(employee_dict) == 0:
                print("There is no user to delete") 
                get_back()
                
            # check if the username exists in users dictionary .
            elif username not in employee_dict:
                print("The username does not exist! Please try again! \n")
                continue

            #ask user for confirmation and proceed to delete the dictionary if yes .
            choice = input(f"The user with username '{username}' was founded, are you sure you want to delete it? (yes/no) : ")
          
            if choice.lower() == "yes":
                del employee_dict[username]
                print(f"The user '{username}' information has been deleted successfully!\n")
                # print the updated users dictionary
                for user in employee_dict.values():
                    print(user)
                    
            elif choice.lower() == "no":
                print(f"The user '{username}' information was not deleted!\n")
                break
            
            else:
                self.remove_employee()
                
        #print all dictionaries in users dictionary.
        print("You employee's information : ")
        for user in employee_dict.values():
            print(user)
            
        get_back()

    
    def employees_information (self):
        "This method print the last version of employees_dict that store."
        
        # print all dictionaries in users dictionary
        print("You employee's information : ")

        for key,value in employee_dict.items():
            print(f"{key}:{value}",end="\n")
        
        
        def get_back():
            "get back to main panel ."
            
            choice = input("Do you want to get back (yes/no) ? : ")
          
            if choice.lower() == "yes":
                self.display_panel()
          
            elif choice.lower() == "no":
                self.employees_information()
          
            else:
                print("Wrong choice! Please try again!\n")
                get_back()
        
        get_back()

            
    def display_panel(self):
        "This method defines the admin panel that when admin logging in to display."
        
        #get inputs .
        print("Choose the option :\n1. Add employee\n2. Remove employee\n3. Show the employee's list\n4. LogOut")
        choice = input("enter the number of your choice : ").strip()
        
        if choice == "1":
            self.add_employee()
        
        elif choice == "2":
            self.remove_employee()
        
        elif choice == "3":
            self.employees_information()
        
        elif choice == "4":
            start.display_start_panel()
        
        else:
            print("Wrong choice! Please try again!\n")
            self.display_panel()
             