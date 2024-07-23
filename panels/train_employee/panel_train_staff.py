from user import User
import panels.panel_start as start
from panels.admin.panel_admin import employee_dict
line_dic = {}
train_dic = {}


class Train_Staff(User):
    "This class have methods for train employees."

    def __init__(self, username= "username", password=123, name_line="name_line", origin="origin",
                  destination="destination", num_state="num_state", list_state=[],
                 name_train="name_train", speed=20, list_stop_time=[], quality="quality",
                   capacity=0, cost_ticket=0, id_train=123):
        super().__init__(username, password)
        self.name_line = name_line
        self.origin = origin
        self.destination = destination
        self.num_state = num_state
        self.list_state = list_state
        self.name_train = name_train
        self.speed = speed
        self.list_stop_time = list_stop_time
        self.quality = quality
        self.capacity = capacity
        self.cost_ticket = cost_ticket
        self.id_train = id_train

    def login(self): 
        "This method defines train employees login operation."
        
        while True:
            
            choice = input("Do you want to back to the Main Panel (yes/no) ? : ").strip().lower()
            if choice == "yes":
                start.display_start_panel()
                
            else:
                #get user username & password .
                username = input("Enter username : ")
                password = input("Enter password : ")
                
                if len(employee_dict) == 0:
                    print("There is no users registered! Please call your admin to register you!\n")
                    start.display_start_panel()
                    break
                
                #check username and password .
                else:
                    if any(username == user["username"] and password == user["password"] for user in employee_dict.values()):
                        print("You logged in successfully!\n")
                        self.display_train_panel()
                        break 
                
                    else:
                        print("Username or Password is incorrect. Please try again!\n")
                        continue
                         
                         
    def add_train_line(self):
        "This method lets the employee to add train lines and lines information."
        
        def get_back():
            "get back to the main panel."
            
            choice = input("Do you want to get back (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                self.display_train_panel()
            
            elif choice == "no":
                self.add_train_line()
            
            else:
                print("Wrong choice! Please try again! \n")
                get_back()
        
        #a list to store states .
        list_state = []
        while True:
            #get user inputs .
            name_line = input("Enter name_line : ").lower().strip()
            
            #check if name_line already exists in Train_line dictionary .
            if name_line in line_dic:
                print("The name is in the dictionary. Please try again.")
                continue

            origin = input("Enter origin : ").strip()
            destination = input("Enter destination : ").strip()
            num_state = int(input("Enter number of states : ").strip())
            for i in range(num_state):
                list_state.append(input(f"Enter state{i+1} : ").strip())
            
            #store user inputs in a dictionary .
            line_info = {
                "name_line": name_line, "origin": origin, "destination": destination,
                "num_state": num_state, "list_state": list_state
            }
            
            #add line_info dictionary to line_dic dictionary .
            line_dic[name_line] = line_info
            print(f"This line {name_line} is added to the list ! \n")
            
            # ask user if they want to enter another set of inputs
            choice = input("Do you want to enter another set of input (yes/no) ? : ").strip().lower()
            if choice != "yes":
                break
            
        # get back to main panel
        get_back()

    
    def remove_line(self):
        "This method lets the employee to remove a train line."
        
        # get back to main panel
        def get_back():
            "get back to the main panel."
            
            choice = input("Do you want to get back (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                self.display_train_panel()
            
            elif choice == "no":
                self.remove_line()
            
            else:
                print("Wrong choice! Please try again!\n")
                get_back()
        
        while True:
            
            #get name_line input from user .
            name_line = input("Enter the name line for delete or 'quit' for exit : ").strip().lower()

            #a word to return .
            if name_line == "quit":
                self.display_train_panel()
            
            #check if there is a train line .
            elif len(line_dic) == 0:
                print("There are no lines added to remove!\n")
                get_back()
                
            # check if name_line exists in train_line dictionary  
            elif not (name_line in line_dic):
                print("The name line is not found! Please try again!\n")
                continue
            
            else:
                print(f"The name line {name_line} is found!")
            
                choice = input("Do you want to delete (yes/no) ? : ").strip().lower()
            
                if choice == "yes":
                    #delete line from line_dic .
                    del line_dic[name_line]
                    print("The name line was deleted successfully !\n")
            
                else:
                    print(f"The {name_line} information was not deleted successfully!\n")
                    self.display_train_panel()
                    break
                
        get_back()
        

    def view_lines(self):
        "This method shows all of the lines that the employee added ."
        
        def get_back():
            "get back to the main panel."
            
            choice = input("Do you want to back (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                self.display_train_panel()
            
            elif choice == "no":
                self.view_lines()
            
            else:
                print("Wrong choice! Please try again! \n")
                get_back()
        
        if not line_dic:
            print("There is no lines added!\n")
            choice = input("Do you want to add an information (yes/no) ? : ").strip().lower()
        
            if choice == "yes":
                get_back()
        
            else:
                choice =input("Do you want to quit (yes/no) ? : ").strip().lower()
        
                if choice == "yes":
                    self.display_train_panel()
        
                else:
                    self.view_lines()
        
        else:
        
            for line_info in line_dic.values():
                print(line_info, end="\n")
        
        get_back()
    

    def update_line(self):
        "This method lets the employee to update information of item in dictionary."
        
        def get_back():
            "get back to the main panel."
            
            choice = input("Do you want to back (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                self.display_train_panel()
            
            elif choice == "no":
                self.update_line()
            
            else:
                get_back()
                
        #a list to store the new information.
        list_new = []
        while True:
            
            #get inputs .
            name_line = input("Enter the name line to update it or type 'quit' to exit: ")
            
            #get name_line of train from user .
            if name_line == "quit":
                self.display_train_panel()
                
            elif line_dic == {}:
                print("There is no line!")
                get_back()
            
            elif not (name_line in line_dic):
                print("The name line does not exist! Please try again!\n")
                continue
            
            else:
                print(f"The name line {line_dic[name_line]} is found!\n")
                
                #choice to update or not .
                choice = input("Do you want to update (yes/no) ? : ").strip().lower()
                
                if choice == "no":
                    self.display_train_panel()
                    break
                #the update panel .
                else:
                    print("1. name_line")
                    print("2. origin")
                    print("3. destination")
                    print("4. num_state")
                    print("5. list_state")
                    change = input("Please choose your choice : ").strip().lower()
                    
                    #origin change .
                    if change == "2":
                        new_value = input(f"Please enter the new value for {change} : ").strip()
                        
                        choice = input("Do you want to change the origin (yes/no) ? : ").strip().lower()
                     
                        if choice == "yes":
                            line_dic[name_line]["origin"] = new_value
                            print("The origin was updated successfully !\n")
                     
                        else:
                            get_back()
                    
                    #destination change .
                    elif change == "3":
                        new_value = input(f"Please enter the new value for {change} : ").strip()
                        
                        choice = input("Do you want to change the destination (yes/no) ? : ").strip().lower()
                        
                        if choice == "yes":
                            line_dic[name_line]["destination"] = new_value
                            print("The destination was updated successfully !\n")
                        
                        else:
                            get_back()
                    
                    #num_state change .
                    elif change == "4":
                        new_value = int(input(f"Please enter the new value for {change}: ").strip())
                        
                        choice = input("Do you want to change the num state (yes/no) ? : ").strip().lower()
                        
                        if choice == "yes":
                            line_dic[name_line]["num_state"] = new_value
                        
                            # num_state in dictionary change the list_state must be change
                            for i in range(new_value):
                                list_new.append(input("Enter state : ").strip())
                        
                            line_dic[name_line]["list_state"] = list_new
                            list_new = []
                            print("The num state was updated successfully !\n")
                        
                        else:
                            get_back()
                        
                    #list_state change .
                    elif change == "5":
                        number = line_dic[name_line]["num_state"]
                        
                        for i in range(number):
                            list_new.append(input("Enter state : ").strip())
                        
                        choice = input("Do you want to change the list state value (yes/no) ? : ").strip().lower()
                        
                        if choice == "yes":
                            line_dic[name_line]["list_state"] = list_new
                            print("The list state value was updated successfully !\n")
                        
                        else:
                            get_back()
                        
                    #name_line change .
                    elif change == "1":
                        new_value = input(f"Please enter the new name for {change}: ").strip()
                        
                        choice = input("Do you want to change the name line (yes/no) ? : ").strip().lower()
                        
                        if choice == "yes":
                            line_dic[new_value] = line_dic.pop(name_line)
                            line_dic[new_value]["name_line"] = new_value
                            print("The name line was updated successfully ! : ")
                        
                        else:
                            get_back()
                        

    # Extra point method
    def check_accident(self):
        "this method checks that new trains will have an accident with other trains or not."
        pass
        # return bool

    
    def add_train(self):
        "This method lets employee to add trains and trains information."
        
        def get_back():
            "get back to the main panel."
            
            choice = input("Do you want to get back (yes/no) ? : ").strip().lower()
            if choice == "yes":
                self.display_train_panel()
            
            elif choice == "no":
                self.add_train()
            
            else:
                print("Wrong choice! Please try again!\n")
                get_back()
        
        #an empty dict to store information .
        train_info_dict = {}
        
        while True:
            id_train = input("Enter train ID : ").strip()
            
            #check the train id .    
            if id_train in train_dic:
                print("Train ID already exists! Please enter another ID!\n")
                continue
            
            #get inputs .
            name_train = input("Enter train name: ").lower().strip()
            name_line = input("Enter line name: ").lower().strip()
            
            if len(line_dic) == 0:
                print("There is no line! First create a line!\n")
                get_back()
            
            if name_line not in line_dic:
                print("Line name does not exist! Please enter a valid line name!\n")
                continue

            speed = input("Enter the train's average speed : ").strip()
            
            
            list  = line_dic[name_line]["list_state"]
            for item in list:
                station = item
                time = input(f"Enter the stop time for station {station} : ")
                train_info_dict[station]=time
            list_stop_time = train_info_dict
            
            quality = input("Enter train quality : ").strip()
            
            cost_ticket = float(input("Enter ticket cost : ").strip())
            
            capacity = int(input("Enter train capacity : ").strip())

            train_info = {
                "id_train": id_train, "name_train": name_train, "name_line": name_line,
                "speed": speed, "list_stop_time": list_stop_time, "quality": quality,
                "cost_ticket": cost_ticket, "capacity": capacity
            }

            train_dic[id_train] = train_info

            print(f"Train {name_train} with ID {id_train} has been added successfully!\n")

            choice = input("Do you want to add another train (yes/no) ? : ").strip().lower()
            if choice != "yes":
                self.display_train_panel()
                break

            get_back()


    def remove_train(self):
        "This method lets the employee to remove a train on a line."
        
        def get_back():
            "get back to the main panel."
        
            choice = input("Do you want to get back (yes/no) ? : ").strip().lower()
        
            if choice == "yes":
                self.display_train_panel()
        
            elif choice == "no":
                self.remove_train()
        
            else:
                print("Wrong choice! Please try again!\n")
                get_back()
        
        while True:
            
            #get id to find the train .
            id_train = input("Enter the train ID to delete or 'quit' for exit : ").strip().lower()

            #a word to return .
            if id_train == "quit":
                self.display_train_panel()
        
            elif len(train_dic) == 0:
                print("There are no trains added!\n")
                get_back()

            #checks the id is available or not .
            elif not (id_train in train_dic):
                print("The train ID was not found! Please try again!\n")
                continue
            
            else:
                print(f"The train with ID {id_train} was found")
                choice = input("Do you want to delete (yes/no) ? : ").strip().lower()
                
                if choice == "yes":
                    del train_dic[id_train]
                    print("The train has been deleted!\n")
                
                else:
                    print(f"The train with ID {id_train} was not deleted!\n")
                    self.display_train_panel()
                    break

            get_back()


    def view_trains(self):
        "This method shows all trains that added by employee."
        
        def get_back():
            "get back to the main panel."
            
            choice = input("Do you want to get back (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                self.display_train_panel()
            
            elif choice == "no":
                self.view_trains()
            
            else:
                print("Wrong choice! Please try again! \n")
                get_back()
        
        #check there is any trains or not .
        if not train_dic:
            print("There is no trains added!\n")
            
            choice = input("Do you want to add an train information (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                get_back()
            
            else:
                choice = input("Do you want to quit (yes/no) ?").strip().lower()
            
                if choice == "yes":
                    self.display_train_panel()
            
                else:
                    self.view_trains()
                    
        else:
            for train_info in train_dic.values():
                print(train_info, end="\n")
        
        # get back to main panel        
        get_back()

    
    def logout(self):
        "This method defines employee logout operation."
        
        #Implement the logic to return to the start panel here .
        print("Logging out and returning to the start panel...\n")
        self.login()
       

    def display_train_panel(self):
        "This method shows the train staff panel after employee logged in."
        
        #get inputs .
        print("choose the option :\n1. Add train line\n2. Update train line\n3. Remove train line\n"
            "4. Display train lines list\n5. Add train information\n6. Remove a train information\n7.Display trains information\n8. LogOUt ")
        
        choice = input("enter your choice : ").strip()
        
        if choice == "1":
            self.add_train_line()
        
        elif choice == "2":
            self.update_line()
        
        elif choice == "3":
            self.remove_line()
        
        elif choice == "4":
            self.view_lines()
        
        elif choice == "5":
            self.add_train()
        
        elif choice == "6":
            self.remove_train()
        
        elif choice == "7":
            self.view_trains()
        
        elif choice == "8":
            self.logout()
        
        else:
            print("Wrong choice! Please try again!\n")
            self.display_train_panel()
             